create or replace function public.admin_set_provider_application_status(
  target_application_id uuid,
  next_status text,
  admin_user_id uuid,
  rejection_note text default null
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
  normalized_status text := lower(coalesce(trim(next_status), ''));
  normalized_rejection_note text := nullif(trim(rejection_note), '');
begin
  if admin_user_id is null then
    raise exception 'Admin user id is required.';
  end if;

  if normalized_status not in ('approved', 'pending', 'rejected', 'suspended') then
    raise exception 'Unsupported provider application status.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where (p.id = admin_user_id or p.user_id = admin_user_id)
      and p.role::text in ('admin', 'organization_owner', 'support_staff')
  ) then
    raise exception 'Only admins can change provider application status.';
  end if;

  select *
  into application_row
  from public.provider_applications
  where id = target_application_id;

  if not found then
    raise exception 'Provider application not found.';
  end if;

  select p.id
  into target_provider_id
  from public.providers p
  where p.user_id = application_row.user_id
  limit 1;

  select p.role::text
  into existing_role
  from public.profiles p
  where p.id = application_row.user_id
     or p.user_id = application_row.user_id
  limit 1;

  perform set_config('app.provider_application_internal', 'on', true);
  perform set_config('app.provider_verification_internal', 'on', true);
  perform set_config('app.allow_profile_role_assignment', 'on', true);

  if normalized_status = 'approved' then
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
      admin_user_id,
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
        reviewed_by_user_id = admin_user_id,
        rejection_reason = null,
        updated_at = now()
    where id = target_application_id;

    return target_provider_id;
  end if;

  if normalized_status = 'suspended' then
    if target_provider_id is null then
      raise exception 'Only active providers can be suspended.';
    end if;

    update public.providers
    set verification_status = 'suspended',
        verified_at = null,
        verified_by_user_id = admin_user_id,
        rejection_reason = null,
        updated_at = now()
    where id = target_provider_id;

    update public.provider_applications
    set status = 'approved',
        reviewed_at = now(),
        reviewed_by_user_id = admin_user_id,
        rejection_reason = null,
        updated_at = now()
    where id = target_application_id;

    return target_provider_id;
  end if;

  if normalized_status = 'pending' then
    if target_provider_id is not null then
      update public.providers
      set verification_status = 'pending',
          verified_at = null,
          verified_by_user_id = null,
          rejection_reason = null,
          verification_submitted_at = now(),
          updated_at = now()
      where id = target_provider_id;
    end if;

    update public.provider_applications
    set status = 'pending',
        submitted_at = now(),
        reviewed_at = null,
        reviewed_by_user_id = null,
        rejection_reason = null,
        updated_at = now()
    where id = target_application_id;

    update public.profiles
    set role = case
      when role::text in ('admin', 'organization_owner', 'support_staff', 'moderator')
        then role
      else 'patient'
    end,
    updated_at = now()
    where id = application_row.user_id
       or user_id = application_row.user_id;

    return target_provider_id;
  end if;

  if target_provider_id is not null then
    update public.providers
    set verification_status = 'rejected',
        verified_at = null,
        verified_by_user_id = admin_user_id,
        rejection_reason = normalized_rejection_note,
        updated_at = now()
    where id = target_provider_id;
  end if;

  update public.provider_applications
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by_user_id = admin_user_id,
      rejection_reason = normalized_rejection_note,
      updated_at = now()
  where id = target_application_id;

  update public.profiles
  set role = case
    when role::text in ('admin', 'organization_owner', 'support_staff', 'moderator')
      then role
    else 'patient'
  end,
  updated_at = now()
  where id = application_row.user_id
     or user_id = application_row.user_id;

  return target_provider_id;
end;
$$;

grant execute on function public.admin_set_provider_application_status(uuid, text, uuid, text) to authenticated;
