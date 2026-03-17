-- CareBridge provider directory and appointment booking expansion
-- TODO: review RLS, conflict prevention guarantees, and audit/event retention before production use.

alter table if exists public.providers
  add column if not exists slug text,
  add column if not exists areas_of_care text[] not null default '{}',
  add column if not exists visit_types text[] not null default '{"telehealth","consultation","follow_up"}';

update public.providers
set slug = coalesce(
  slug,
  trim(both '-' from regexp_replace(lower(display_name), '[^a-z0-9]+', '-', 'g'))
)
where slug is null;

create unique index if not exists providers_slug_key on public.providers(slug);
create unique index if not exists providers_user_id_unique on public.providers(user_id);
create unique index if not exists patients_user_id_unique on public.patients(user_id);

alter table if exists public.provider_availability_windows
  add column if not exists day_of_week integer,
  add column if not exists slot_duration_minutes integer not null default 30;

update public.provider_availability_windows
set day_of_week = coalesce(day_of_week, weekday)
where day_of_week is null;

alter table if exists public.provider_availability_windows
  alter column day_of_week set not null;

alter table if exists public.provider_availability_windows
  add constraint provider_availability_day_of_week_check
  check (day_of_week between 0 and 6);

alter table if exists public.appointments
  alter column status set default 'requested';

create index if not exists appointments_provider_start_idx on public.appointments(provider_id, start_time);
create index if not exists appointments_patient_start_idx on public.appointments(patient_id, start_time);
