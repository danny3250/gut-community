alter table if exists public.providers
  add column if not exists slug text,
  add column if not exists verification_status text not null default 'draft',
  add column if not exists verification_submitted_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists license_number text,
  add column if not exists npi_number text,
  add column if not exists license_states text[] not null default '{}',
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists is_accepting_patients boolean not null default false;

update public.providers
set slug = trim(both '-' from regexp_replace(lower(display_name), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

create unique index if not exists providers_slug_key on public.providers(slug);
create unique index if not exists providers_user_id_key on public.providers(user_id);
create index if not exists providers_verification_status_idx on public.providers(verification_status);

create or replace function public.prevent_provider_verification_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  if public.is_admin_role() or jwt_role = 'service_role' then
    return new;
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'Providers can only manage their own application.';
  end if;

  if new.verification_status in ('verified', 'suspended') then
    raise exception 'Only admins can assign this verification status.';
  end if;

  if new.verified_at is distinct from old.verified_at then
    raise exception 'Only admins can set verified timestamps.';
  end if;

  if new.verified_by_user_id is distinct from old.verified_by_user_id then
    raise exception 'Only admins can set verifier information.';
  end if;

  if new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Only admins can set rejection notes.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_provider_verification_fields on public.providers;
create trigger protect_provider_verification_fields
before update on public.providers
for each row
execute function public.prevent_provider_verification_self_approval();

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  if public.is_admin_role() or jwt_role = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null then
      if coalesce(new.role::text, 'patient') <> 'patient' then
        raise exception 'Only admins can assign non-patient roles.';
      end if;

      return new;
    end if;

    if coalesce(new.id, new.user_id) is distinct from auth.uid() then
      raise exception 'Profiles can only be created for the authenticated user.';
    end if;

    if coalesce(new.role::text, 'patient') <> 'patient' then
      raise exception 'Only admins can assign non-patient roles.';
    end if;

    return new;
  end if;

  if coalesce(old.id, old.user_id) is distinct from auth.uid() then
    raise exception 'Profiles can only be updated by their owner.';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only admins can change profile roles.';
  end if;

  return new;
end;
$$;

drop policy if exists "providers_public_read" on public.providers;
create policy "providers_public_read"
on public.providers
for select
using (
  public.is_admin_role()
  or user_id = auth.uid()
  or verification_status = 'verified'
);
