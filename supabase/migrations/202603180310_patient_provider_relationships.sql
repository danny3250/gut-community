create table if not exists public.patient_provider_relationships (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked', 'active', 'past')),
  is_primary boolean not null default false,
  is_favorite boolean not null default false,
  first_appointment_at timestamptz null,
  last_appointment_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (patient_id, provider_id)
);

create index if not exists patient_provider_relationships_patient_idx
  on public.patient_provider_relationships (patient_id, updated_at desc);

create index if not exists patient_provider_relationships_provider_idx
  on public.patient_provider_relationships (provider_id, updated_at desc);

create unique index if not exists patient_provider_relationships_primary_patient_idx
  on public.patient_provider_relationships (patient_id)
  where is_primary = true;

create or replace function public.set_patient_provider_relationship_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.guard_patient_provider_relationship_updates()
returns trigger
language plpgsql
as $$
declare
  current_role text;
begin
  select profiles.role into current_role
  from public.profiles
  where profiles.id = auth.uid();

  if current_role = 'admin' then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.first_appointment_at is distinct from old.first_appointment_at
     or new.last_appointment_at is distinct from old.last_appointment_at
     or new.patient_id is distinct from old.patient_id
     or new.provider_id is distinct from old.provider_id then
    raise exception 'Only admins can edit relationship continuity fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists set_patient_provider_relationship_updated_at on public.patient_provider_relationships;
create trigger set_patient_provider_relationship_updated_at
before update on public.patient_provider_relationships
for each row
execute function public.set_patient_provider_relationship_updated_at();

drop trigger if exists guard_patient_provider_relationship_updates on public.patient_provider_relationships;
create trigger guard_patient_provider_relationship_updates
before update on public.patient_provider_relationships
for each row
execute function public.guard_patient_provider_relationship_updates();

alter table public.patient_provider_relationships enable row level security;

drop policy if exists "Patients can view their own provider relationships" on public.patient_provider_relationships;
create policy "Patients can view their own provider relationships"
on public.patient_provider_relationships
for select
using (
  exists (
    select 1
    from public.patients
    where patients.id = patient_provider_relationships.patient_id
      and patients.user_id = auth.uid()
  )
);

drop policy if exists "Providers can view their own patient relationships" on public.patient_provider_relationships;
create policy "Providers can view their own patient relationships"
on public.patient_provider_relationships
for select
using (
  exists (
    select 1
    from public.providers
    where providers.id = patient_provider_relationships.provider_id
      and providers.user_id = auth.uid()
  )
);

drop policy if exists "Patients can update their relationship preferences" on public.patient_provider_relationships;
create policy "Patients can update their relationship preferences"
on public.patient_provider_relationships
for update
using (
  exists (
    select 1
    from public.patients
    where patients.id = patient_provider_relationships.patient_id
      and patients.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.patients
    where patients.id = patient_provider_relationships.patient_id
      and patients.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage patient provider relationships" on public.patient_provider_relationships;
create policy "Admins can manage patient provider relationships"
on public.patient_provider_relationships
for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

insert into public.patient_provider_relationships (
  patient_id,
  provider_id,
  status,
  first_appointment_at,
  last_appointment_at
)
select
  appointments.patient_id,
  appointments.provider_id,
  case
    when bool_or(appointments.status in ('requested', 'confirmed') and appointments.end_time >= timezone('utc', now()))
         and bool_or(appointments.status in ('confirmed', 'completed', 'no_show') and appointments.start_time < timezone('utc', now())) then 'active'
    when bool_or(appointments.status in ('requested', 'confirmed') and appointments.end_time >= timezone('utc', now())) then 'booked'
    else 'past'
  end,
  min(appointments.start_time),
  max(appointments.end_time)
from public.appointments
where appointments.status <> 'cancelled'
group by appointments.patient_id, appointments.provider_id
on conflict (patient_id, provider_id) do update
set
  status = excluded.status,
  first_appointment_at = coalesce(public.patient_provider_relationships.first_appointment_at, excluded.first_appointment_at),
  last_appointment_at = greatest(public.patient_provider_relationships.last_appointment_at, excluded.last_appointment_at),
  updated_at = timezone('utc', now());
