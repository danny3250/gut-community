create or replace function public.prevent_provider_verification_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := current_setting('request.jwt.claim.role', true);
  internal_mode text := current_setting('app.provider_verification_internal', true);
begin
  if internal_mode = 'on'
    or public.is_admin_role()
    or jwt_role = 'service_role'
    or (auth.uid() is null and jwt_role is null) then
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

  perform set_config('app.provider_application_internal', 'on', true);
  perform set_config('app.provider_verification_internal', 'on', true);

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
