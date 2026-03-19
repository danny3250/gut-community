create table if not exists public.provider_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  display_name text not null,
  credentials text,
  specialty text,
  bio text,
  states_served text[] not null default '{}',
  telehealth_enabled boolean not null default true,
  organization_id uuid references public.organizations(id) on delete set null,
  license_number text,
  npi_number text,
  license_states text[] not null default '{}',
  is_accepting_patients boolean not null default false,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_applications_status_check check (status in ('pending', 'approved', 'rejected'))
);

create unique index if not exists provider_applications_user_id_key
  on public.provider_applications(user_id);
create index if not exists provider_applications_status_idx
  on public.provider_applications(status, submitted_at desc);
create index if not exists provider_applications_org_idx
  on public.provider_applications(organization_id, status);

alter table public.provider_applications enable row level security;

create or replace function public.guard_provider_application_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  if current_setting('app.provider_application_bootstrap', true) = 'on'
    or public.is_admin_role()
    or jwt_role = 'service_role' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'Provider applications can only be managed by their owner.';
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.submitted_at := coalesce(new.submitted_at, now());
    new.reviewed_at := null;
    new.reviewed_by_user_id := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.status is distinct from 'pending' then
    raise exception 'Applicants cannot set review status directly.';
  end if;

  if new.reviewed_at is not null or new.reviewed_by_user_id is not null then
    raise exception 'Applicants cannot set review metadata.';
  end if;

  if new.rejection_reason is not null then
    raise exception 'Applicants cannot set rejection notes.';
  end if;

  new.submitted_at := coalesce(old.submitted_at, new.submitted_at, now());
  return new;
end;
$$;

drop trigger if exists protect_provider_application_updates on public.provider_applications;
create trigger protect_provider_application_updates
before insert or update on public.provider_applications
for each row
execute function public.guard_provider_application_updates();

drop policy if exists "provider_applications_select_own_or_admin" on public.provider_applications;
create policy "provider_applications_select_own_or_admin"
on public.provider_applications
for select
using (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "provider_applications_insert_own_or_admin" on public.provider_applications;
create policy "provider_applications_insert_own_or_admin"
on public.provider_applications
for insert
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "provider_applications_update_own_or_admin" on public.provider_applications;
create policy "provider_applications_update_own_or_admin"
on public.provider_applications
for update
using (
  public.is_admin_role()
  or user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

create or replace function public.approve_provider_application(
  target_application_id uuid,
  reviewer_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_row public.provider_applications%rowtype;
  target_provider_id uuid;
  existing_role text;
begin
  if reviewer_user_id is null then
    raise exception 'Reviewer user id is required.';
  end if;

  select *
  into application_row
  from public.provider_applications
  where id = target_application_id;

  if not found then
    raise exception 'Provider application not found.';
  end if;

  insert into public.providers (
    user_id,
    display_name,
    slug,
    credentials,
    specialty,
    bio,
    states_served,
    license_states,
    license_number,
    npi_number,
    telehealth_enabled,
    organization_id,
    verification_status,
    verification_submitted_at,
    verified_at,
    verified_by_user_id,
    rejection_reason,
    onboarding_completed,
    is_accepting_patients,
    updated_at
  )
  values (
    application_row.user_id,
    application_row.display_name,
    trim(both '-' from regexp_replace(lower(application_row.display_name), '[^a-z0-9]+', '-', 'g')),
    application_row.credentials,
    application_row.specialty,
    application_row.bio,
    application_row.states_served,
    application_row.license_states,
    application_row.license_number,
    application_row.npi_number,
    application_row.telehealth_enabled,
    application_row.organization_id,
    'verified',
    application_row.submitted_at,
    now(),
    reviewer_user_id,
    null,
    true,
    application_row.is_accepting_patients,
    now()
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        slug = excluded.slug,
        credentials = excluded.credentials,
        specialty = excluded.specialty,
        bio = excluded.bio,
        states_served = excluded.states_served,
        license_states = excluded.license_states,
        license_number = excluded.license_number,
        npi_number = excluded.npi_number,
        telehealth_enabled = excluded.telehealth_enabled,
        organization_id = excluded.organization_id,
        verification_status = 'verified',
        verification_submitted_at = excluded.verification_submitted_at,
        verified_at = excluded.verified_at,
        verified_by_user_id = excluded.verified_by_user_id,
        rejection_reason = null,
        onboarding_completed = true,
        is_accepting_patients = excluded.is_accepting_patients,
        updated_at = now()
  returning id into target_provider_id;

  select role::text
  into existing_role
  from public.profiles
  where id = application_row.user_id
     or user_id = application_row.user_id
  limit 1;

  perform set_config('app.allow_profile_role_assignment', 'on', true);

  insert into public.profiles (id, user_id, role, display_name, organization_id, updated_at)
  values (
    application_row.user_id,
    application_row.user_id,
    case
      when coalesce(existing_role, '') in ('admin', 'organization_owner', 'support_staff', 'moderator')
        then existing_role
      else 'provider'
    end,
    application_row.display_name,
    application_row.organization_id,
    now()
  )
  on conflict (id) do update
    set user_id = coalesce(public.profiles.user_id, excluded.user_id),
        display_name = excluded.display_name,
        organization_id = excluded.organization_id,
        updated_at = now(),
        role = case
          when public.profiles.role::text in ('admin', 'organization_owner', 'support_staff', 'moderator')
            then public.profiles.role
          else excluded.role
        end;

  update public.provider_applications
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by_user_id = reviewer_user_id,
      rejection_reason = null,
      updated_at = now()
  where id = target_application_id;

  return target_provider_id;
end;
$$;

create or replace function public.reject_provider_application(
  target_application_id uuid,
  reviewer_user_id uuid,
  rejection_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_user_id uuid;
begin
  if reviewer_user_id is null then
    raise exception 'Reviewer user id is required.';
  end if;

  update public.provider_applications
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by_user_id = reviewer_user_id,
      rejection_reason = nullif(trim(rejection_note), ''),
      updated_at = now()
  where id = target_application_id
  returning user_id into application_user_id;

  if application_user_id is null then
    raise exception 'Provider application not found.';
  end if;

  if not exists (
    select 1
    from public.providers p
    where p.user_id = application_user_id
      and p.verification_status in ('verified', 'suspended')
  ) then
    perform set_config('app.allow_profile_role_assignment', 'on', true);

    update public.profiles
    set role = case
      when role::text in ('admin', 'organization_owner', 'support_staff', 'moderator')
        then role
      else 'patient'
    end,
    updated_at = now()
    where id = application_user_id
       or user_id = application_user_id;
  end if;

  return application_user_id;
end;
$$;

grant execute on function public.approve_provider_application(uuid, uuid) to authenticated;
grant execute on function public.reject_provider_application(uuid, uuid, text) to authenticated;

select set_config('app.provider_application_bootstrap', 'on', true);

insert into public.provider_applications (
  user_id,
  full_name,
  display_name,
  credentials,
  specialty,
  bio,
  states_served,
  telehealth_enabled,
  organization_id,
  license_number,
  npi_number,
  license_states,
  is_accepting_patients,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by_user_id,
  rejection_reason,
  created_at,
  updated_at
)
select
  p.user_id,
  p.display_name,
  p.display_name,
  p.credentials,
  p.specialty,
  p.bio,
  p.states_served,
  p.telehealth_enabled,
  p.organization_id,
  p.license_number,
  p.npi_number,
  coalesce(p.license_states, '{}'),
  coalesce(p.is_accepting_patients, false),
  case
    when p.verification_status = 'rejected' then 'rejected'
    when p.verification_status in ('verified', 'suspended') then 'approved'
    else 'pending'
  end,
  coalesce(p.verification_submitted_at, p.created_at, now()),
  case
    when p.verification_status in ('verified', 'suspended') then coalesce(p.verified_at, p.updated_at, now())
    when p.verification_status = 'rejected' then coalesce(p.updated_at, now())
    else null
  end,
  p.verified_by_user_id,
  p.rejection_reason,
  coalesce(p.created_at, now()),
  coalesce(p.updated_at, now())
from public.providers p
on conflict (user_id) do update
set full_name = coalesce(public.provider_applications.full_name, excluded.full_name),
    display_name = excluded.display_name,
    credentials = excluded.credentials,
    specialty = excluded.specialty,
    bio = excluded.bio,
    states_served = excluded.states_served,
    telehealth_enabled = excluded.telehealth_enabled,
    organization_id = excluded.organization_id,
    license_number = excluded.license_number,
    npi_number = excluded.npi_number,
    license_states = excluded.license_states,
    is_accepting_patients = excluded.is_accepting_patients,
    status = case
      when public.provider_applications.status = 'approved' then public.provider_applications.status
      else excluded.status
    end,
    submitted_at = coalesce(public.provider_applications.submitted_at, excluded.submitted_at),
    reviewed_at = coalesce(public.provider_applications.reviewed_at, excluded.reviewed_at),
    reviewed_by_user_id = coalesce(public.provider_applications.reviewed_by_user_id, excluded.reviewed_by_user_id),
    rejection_reason = coalesce(excluded.rejection_reason, public.provider_applications.rejection_reason),
    updated_at = now();

delete from public.providers
where verification_status not in ('verified', 'suspended');

select set_config('app.provider_application_bootstrap', 'off', true);

select set_config('app.allow_profile_role_assignment', 'on', true);

update public.profiles
set role = case
  when role::text in ('admin', 'organization_owner', 'support_staff', 'moderator') then role
  when exists (
    select 1
    from public.providers p
    where p.user_id = public.profiles.id
      and p.verification_status in ('verified', 'suspended')
  ) then 'provider'
  else 'patient'
end,
updated_at = now()
where role::text = 'provider'
   or exists (
     select 1
     from public.providers p
     where p.user_id = public.profiles.id
   )
   or exists (
     select 1
     from public.provider_applications pa
     where pa.user_id = public.profiles.id
   );
