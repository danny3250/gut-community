-- Canonical auth/bootstrap repair:
-- 1. ensure new auth users get a safe profile bootstrap owned by migrations
-- 2. create patient records only for patient users
-- 3. preserve existing elevated roles instead of overwriting them
-- 4. allow a controlled provider-role assignment path during provider onboarding

alter table if exists public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = case
  when role is null then 'patient'
  when role::text in ('patient', 'provider', 'admin', 'organization_owner', 'support_staff', 'moderator') then role::text
  when role::text in ('owner', 'org_owner') then 'organization_owner'
  when role::text in ('staff', 'support') then 'support_staff'
  else 'patient'
end;

alter table if exists public.profiles
  add constraint profiles_role_check
  check (role in ('patient', 'provider', 'admin', 'organization_owner', 'support_staff', 'moderator'));

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := current_setting('request.jwt.claim.role', true);
  allow_role_assignment text := current_setting('app.allow_profile_role_assignment', true);
begin
  if allow_role_assignment = 'on' or public.is_admin_role() or jwt_role = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null then
      if coalesce(new.role::text, 'patient') <> 'patient' then
        raise exception 'Only admins can assign non-patient roles.';
      end if;

      return new;
    end if;

    if new.id is distinct from auth.uid() and coalesce(new.user_id, new.id) is distinct from auth.uid() then
      raise exception 'Profiles can only be created for the authenticated user.';
    end if;

    if coalesce(new.role::text, 'patient') <> 'patient' then
      raise exception 'Only admins can assign non-patient roles.';
    end if;

    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed.';
  end if;

  if coalesce(new.user_id, new.id) is distinct from coalesce(old.user_id, old.id) then
    raise exception 'Profile user mapping cannot be changed.';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only admins can change roles.';
  end if;

  return new;
end;
$$;

create or replace function public.bootstrap_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  requested_role text := lower(coalesce(new.raw_user_meta_data ->> 'requested_role', 'patient'));
  wants_provider boolean := requested_role = 'provider';
  default_display_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))), '');
begin
  perform set_config('app.allow_profile_role_assignment', 'on', true);

  insert into public.profiles (id, user_id, role, display_name, updated_at)
  values (
    new.id,
    new.id,
    case when wants_provider then 'provider' else 'patient' end,
    default_display_name,
    now()
  )
  on conflict (id) do update
    set user_id = coalesce(public.profiles.user_id, excluded.user_id),
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now(),
        role = case
          when public.profiles.role::text in ('admin', 'organization_owner', 'support_staff', 'moderator', 'provider')
            then public.profiles.role
          else excluded.role
        end;

  if not wants_provider then
    insert into public.patients (user_id, legal_name, email, created_at, updated_at)
    values (
      new.id,
      coalesce(default_display_name, new.email, 'CareBridge Patient'),
      new.email,
      now(),
      now()
    )
    on conflict (user_id) do update
      set email = coalesce(public.patients.email, excluded.email),
          legal_name = coalesce(public.patients.legal_name, excluded.legal_name),
          updated_at = now();
  end if;

  return new;
end;
$$;

create or replace function public.promote_current_user_to_provider_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.providers p
    where p.user_id = auth.uid()
  ) then
    raise exception 'Provider application not found for the authenticated user.';
  end if;

  select p.role::text
  into existing_role
  from public.profiles p
  where p.id = auth.uid()
     or p.user_id = auth.uid()
  limit 1;

  if existing_role in ('admin', 'organization_owner', 'support_staff', 'moderator') then
    return existing_role;
  end if;

  perform set_config('app.allow_profile_role_assignment', 'on', true);

  insert into public.profiles (id, user_id, role, updated_at)
  values (auth.uid(), auth.uid(), 'provider', now())
  on conflict (id) do update
    set user_id = coalesce(public.profiles.user_id, excluded.user_id),
        updated_at = now(),
        role = case
          when public.profiles.role::text in ('admin', 'organization_owner', 'support_staff', 'moderator')
            then public.profiles.role
          else excluded.role
        end;

  return 'provider';
end;
$$;

grant execute on function public.promote_current_user_to_provider_role() to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists handle_new_user on auth.users;
drop trigger if exists handle_auth_user_created on auth.users;
drop trigger if exists bootstrap_new_user_profile on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.bootstrap_auth_user();

-- Backfill missing bootstrap rows safely for existing auth users.
do $$
begin
  perform set_config('app.allow_profile_role_assignment', 'on', true);

  insert into public.profiles (id, user_id, role, display_name, updated_at)
  select
    u.id,
    u.id,
    case
      when exists (select 1 from public.providers pr where pr.user_id = u.id) then 'provider'
      else 'patient'
    end,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))), ''),
    now()
  from auth.users u
  on conflict (id) do update
    set user_id = coalesce(public.profiles.user_id, excluded.user_id),
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now(),
        role = case
          when public.profiles.role::text in ('admin', 'organization_owner', 'support_staff', 'moderator', 'provider')
            then public.profiles.role
          else excluded.role
        end;

  insert into public.patients (user_id, legal_name, email, created_at, updated_at)
  select
    u.id,
    coalesce(nullif(trim(coalesce(p.display_name, split_part(u.email, '@', 1))), ''), u.email, 'CareBridge Patient'),
    u.email,
    now(),
    now()
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.role::text = 'patient'
  on conflict (user_id) do update
    set email = coalesce(public.patients.email, excluded.email),
        legal_name = coalesce(public.patients.legal_name, excluded.legal_name),
        updated_at = now();
end;
$$;
