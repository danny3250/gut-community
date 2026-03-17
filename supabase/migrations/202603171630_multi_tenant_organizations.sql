-- CareBridge multi-tenant organization hardening
-- NOTE:
-- This migration strengthens tenant boundaries for clinic and organization operations.
-- It does NOT by itself make the platform HIPAA compliant or production-ready for PHI.
-- TODO: review tenant assignment workflows, audit/event retention, support staff permissions,
-- and operational escalation processes before production use.

alter table if exists public.profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table if exists public.organizations
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

alter table if exists public.audit_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists patients_organization_id_idx on public.patients(organization_id);
create index if not exists providers_organization_id_idx on public.providers(organization_id);
create index if not exists appointments_organization_id_idx on public.appointments(organization_id);
create index if not exists audit_logs_organization_id_idx on public.audit_logs(organization_id);
create unique index if not exists organizations_owner_user_id_unique
  on public.organizations(owner_user_id)
  where owner_user_id is not null;

update public.profiles p
set organization_id = coalesce(
  p.organization_id,
  (
    select pr.organization_id
    from public.providers pr
    where pr.user_id = coalesce(p.user_id, p.id)
    limit 1
  ),
  (
    select pa.organization_id
    from public.patients pa
    where pa.user_id = coalesce(p.user_id, p.id)
    limit 1
  )
)
where p.organization_id is null;

update public.organizations o
set owner_user_id = coalesce(
  o.owner_user_id,
  (
    select coalesce(p.user_id, p.id)
    from public.profiles p
    where p.organization_id = o.id
      and p.role = 'organization_owner'
    order by p.updated_at desc nulls last, p.id
    limit 1
  )
)
where o.owner_user_id is null;

update public.appointments a
set organization_id = coalesce(
  a.organization_id,
  (
    select pr.organization_id
    from public.providers pr
    where pr.id = a.provider_id
  ),
  (
    select pa.organization_id
    from public.patients pa
    where pa.id = a.patient_id
  )
)
where a.organization_id is null;

update public.audit_logs al
set organization_id = coalesce(
  al.organization_id,
  (
    select p.organization_id
    from public.profiles p
    where coalesce(p.user_id, p.id) = al.actor_user_id
    limit 1
  ),
  (
    select pr.organization_id
    from public.providers pr
    where pr.user_id = al.actor_user_id
    limit 1
  ),
  (
    select pa.organization_id
    from public.patients pa
    where pa.user_id = al.actor_user_id
    limit 1
  )
)
where al.organization_id is null;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text
  from public.profiles p
  where p.id = auth.uid()
     or p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_patient_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.patients p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_provider_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.providers p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_profile_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
     or p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_provider_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.providers p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_patient_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.patients p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_profile_organization_id(),
    public.current_provider_organization_id(),
    public.current_patient_organization_id()
  );
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_organization_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'organization_owner';
$$;

create or replace function public.is_support_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'support_staff';
$$;

create or replace function public.is_org_staff_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_organization_owner() or public.is_support_staff();
$$;

create or replace function public.is_staff_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'organization_owner', 'support_staff');
$$;

create or replace function public.organization_for_provider(target_provider_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.providers p
  where p.id = target_provider_id
  limit 1;
$$;

create or replace function public.organization_for_patient(target_patient_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.patients p
  where p.id = target_patient_id
  limit 1;
$$;

create or replace function public.organization_for_appointment(target_appointment_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.organization_id
  from public.appointments a
  where a.id = target_appointment_id
  limit 1;
$$;

create or replace function public.organization_for_user(target_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.organization_id
      from public.profiles p
      where coalesce(p.user_id, p.id) = target_user_id
      limit 1
    ),
    (
      select pr.organization_id
      from public.providers pr
      where pr.user_id = target_user_id
      limit 1
    ),
    (
      select pa.organization_id
      from public.patients pa
      where pa.user_id = target_user_id
      limit 1
    ),
    (
      select o.id
      from public.organizations o
      where o.owner_user_id = target_user_id
      limit 1
    )
  );
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_role()
    or (
      public.is_org_staff_role()
      and target_organization_id is not null
      and target_organization_id is not distinct from public.current_organization_id()
    );
$$;

create or replace function public.can_view_user_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_role()
    or target_user_id = auth.uid()
    or public.can_manage_organization(public.organization_for_user(target_user_id));
$$;

create or replace function public.can_access_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_role()
    or target_patient_id = public.current_patient_id()
    or public.can_manage_organization(public.organization_for_patient(target_patient_id))
    or exists (
      select 1
      from public.appointments a
      join public.patients pa on pa.id = a.patient_id
      join public.providers pr on pr.id = a.provider_id
      where a.patient_id = target_patient_id
        and a.provider_id = public.current_provider_id()
        and pa.organization_id is not distinct from pr.organization_id
        and pr.organization_id is not distinct from public.current_provider_organization_id()
    );
$$;

create or replace function public.can_access_provider(target_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_role()
    or target_provider_id = public.current_provider_id()
    or public.can_manage_organization(public.organization_for_provider(target_provider_id));
$$;

create or replace function public.can_access_appointment(target_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    where a.id = target_appointment_id
      and (
        public.is_admin_role()
        or public.can_manage_organization(a.organization_id)
        or (
          a.patient_id = public.current_patient_id()
          and a.organization_id is not distinct from public.current_patient_organization_id()
        )
        or (
          a.provider_id = public.current_provider_id()
          and a.organization_id is not distinct from public.current_provider_organization_id()
        )
      )
  );
$$;

create or replace function public.sync_appointment_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_org uuid;
  patient_org uuid;
begin
  select organization_id into provider_org
  from public.providers
  where id = new.provider_id;

  select organization_id into patient_org
  from public.patients
  where id = new.patient_id;

  if provider_org is distinct from patient_org and patient_org is not null then
    raise exception 'Patient and provider must belong to the same organization.';
  end if;

  if new.organization_id is not null and new.organization_id is distinct from coalesce(provider_org, patient_org) then
    raise exception 'Appointment organization does not match the patient/provider organization.';
  end if;

  if patient_org is null and provider_org is not null then
    update public.patients
    set organization_id = provider_org,
        updated_at = now()
    where id = new.patient_id;
    patient_org := provider_org;
  end if;

  new.organization_id := coalesce(provider_org, patient_org, new.organization_id);
  return new;
end;
$$;

drop trigger if exists sync_appointment_organization on public.appointments;
create trigger sync_appointment_organization
before insert or update on public.appointments
for each row
execute function public.sync_appointment_organization();

alter table if exists public.organizations enable row level security;

drop policy if exists "organizations_public_read" on public.organizations;
create policy "organizations_public_read"
on public.organizations
for select
using (
  true
);

drop policy if exists "organizations_admin_or_owner_write" on public.organizations;
create policy "organizations_admin_or_owner_write"
on public.organizations
for all
using (
  public.is_admin_role()
  or public.can_manage_organization(id)
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(id)
);

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (
  public.can_view_user_profile(coalesce(user_id, id))
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (
  public.is_admin_role()
  or coalesce(user_id, id) = auth.uid()
)
with check (
  public.is_admin_role()
  or coalesce(user_id, id) = auth.uid()
);

drop policy if exists "profiles_insert_own_or_admin" on public.profiles;
create policy "profiles_insert_own_or_admin"
on public.profiles
for insert
with check (
  public.is_admin_role()
  or coalesce(user_id, id) = auth.uid()
);

drop policy if exists "patients_select_own_provider_admin" on public.patients;
create policy "patients_select_own_provider_admin"
on public.patients
for select
using (
  public.can_access_patient(id)
);

drop policy if exists "patients_insert_own_or_admin" on public.patients;
create policy "patients_insert_own_or_admin"
on public.patients
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or user_id = auth.uid()
);

drop policy if exists "patients_update_own_or_admin" on public.patients;
create policy "patients_update_own_or_admin"
on public.patients
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or user_id = auth.uid()
);

drop policy if exists "providers_public_read" on public.providers;
create policy "providers_public_read"
on public.providers
for select
using (true);

drop policy if exists "providers_insert_own_or_admin" on public.providers;
create policy "providers_insert_own_or_admin"
on public.providers
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or (
    user_id = auth.uid()
    and organization_id is not distinct from public.current_organization_id()
  )
);

drop policy if exists "providers_update_own_or_admin" on public.providers;
create policy "providers_update_own_or_admin"
on public.providers
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or user_id = auth.uid()
);

drop policy if exists "appointments_select_related_or_admin" on public.appointments;
create policy "appointments_select_related_or_admin"
on public.appointments
for select
using (
  public.can_access_appointment(id)
);

drop policy if exists "appointments_insert_patient_or_admin" on public.appointments;
create policy "appointments_insert_patient_or_admin"
on public.appointments
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.appointments.organization_id)
  or (
    public.appointments.patient_id = public.current_patient_id()
    and exists (
      select 1
      from public.patients pa
      join public.providers pr on pr.id = public.appointments.provider_id
      where pa.id = public.appointments.patient_id
        and (
          pa.organization_id is null
          or pa.organization_id is not distinct from pr.organization_id
        )
        and public.appointments.organization_id is not distinct from coalesce(pr.organization_id, pa.organization_id)
    )
  )
);

drop policy if exists "appointments_update_provider_or_admin" on public.appointments;
create policy "appointments_update_provider_or_admin"
on public.appointments
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or (
    provider_id = public.current_provider_id()
    and organization_id is not distinct from public.current_provider_organization_id()
  )
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or (
    provider_id = public.current_provider_id()
    and organization_id is not distinct from public.current_provider_organization_id()
  )
);

drop policy if exists "visits_select_related_or_admin" on public.visits;
create policy "visits_select_related_or_admin"
on public.visits
for select
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_appointment(appointment_id))
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
);

drop policy if exists "visits_insert_related_or_admin" on public.visits;
create policy "visits_insert_related_or_admin"
on public.visits
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_appointment(appointment_id))
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
);

drop policy if exists "visits_update_related_or_admin" on public.visits;
create policy "visits_update_related_or_admin"
on public.visits
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_appointment(appointment_id))
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_appointment(appointment_id))
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
);

drop policy if exists "documents_select_related_or_admin" on public.documents;
create policy "documents_select_related_or_admin"
on public.documents
for select
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
);

drop policy if exists "documents_insert_related_or_admin" on public.documents;
create policy "documents_insert_related_or_admin"
on public.documents
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or (
    uploaded_by_user_id = auth.uid()
    and (
      patient_id = public.current_patient_id()
      or public.can_access_patient(patient_id)
    )
  )
);

drop policy if exists "documents_update_related_or_admin" on public.documents;
create policy "documents_update_related_or_admin"
on public.documents
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or uploaded_by_user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or uploaded_by_user_id = auth.uid()
);

drop policy if exists "intake_forms_select_related_or_admin" on public.intake_forms;
create policy "intake_forms_select_related_or_admin"
on public.intake_forms
for select
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
);

drop policy if exists "intake_forms_insert_related_or_admin" on public.intake_forms;
create policy "intake_forms_insert_related_or_admin"
on public.intake_forms
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or patient_id = public.current_patient_id()
);

drop policy if exists "intake_forms_update_related_or_admin" on public.intake_forms;
create policy "intake_forms_update_related_or_admin"
on public.intake_forms
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
);

drop policy if exists "consents_select_related_or_admin" on public.consents;
create policy "consents_select_related_or_admin"
on public.consents
for select
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
);

drop policy if exists "consents_insert_own_or_admin" on public.consents;
create policy "consents_insert_own_or_admin"
on public.consents
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_patient(patient_id))
  or patient_id = public.current_patient_id()
);

drop policy if exists "audit_logs_admin_only_select" on public.audit_logs;
create policy "audit_logs_admin_only_select"
on public.audit_logs
for select
using (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
);

drop policy if exists "audit_logs_admin_only_insert" on public.audit_logs;
create policy "audit_logs_admin_only_insert"
on public.audit_logs
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
  or (
    auth.uid() is not null
    and actor_user_id = auth.uid()
    and coalesce(actor_role, public.current_app_role()) = public.current_app_role()
    and organization_id is not distinct from public.current_organization_id()
  )
);

drop policy if exists "audit_logs_admin_only_update" on public.audit_logs;
create policy "audit_logs_admin_only_update"
on public.audit_logs
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(organization_id)
);

drop policy if exists "provider_availability_public_read" on public.provider_availability_windows;
create policy "provider_availability_public_read"
on public.provider_availability_windows
for select
using (true);

drop policy if exists "provider_availability_insert_own_or_admin" on public.provider_availability_windows;
create policy "provider_availability_insert_own_or_admin"
on public.provider_availability_windows
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
);

drop policy if exists "provider_availability_update_own_or_admin" on public.provider_availability_windows;
create policy "provider_availability_update_own_or_admin"
on public.provider_availability_windows
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
);

drop policy if exists "provider_availability_delete_own_or_admin" on public.provider_availability_windows;
create policy "provider_availability_delete_own_or_admin"
on public.provider_availability_windows
for delete
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
);
