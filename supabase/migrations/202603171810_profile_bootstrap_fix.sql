-- Allow auth/admin-driven profile bootstrap inserts while preserving normal client-side role protections.

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin_role() then
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
