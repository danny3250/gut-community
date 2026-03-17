-- CareBridge telehealth visit lifecycle foundation
-- NOTE:
-- This schema prepares visit lifecycle handling but does not make the platform HIPAA compliant by itself.
-- TODO: complete audit logging, legal review, incident response, encryption, and vendor/BAA validation before PHI use.

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  status text not null default 'scheduled',
  visit_vendor text not null default 'mock',
  vendor_session_id text,
  patient_join_token text,
  provider_join_token text,
  join_url_patient text,
  join_url_provider text,
  patient_joined_at timestamptz,
  provider_joined_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists visits_appointment_unique on public.visits(appointment_id);
create index if not exists visits_patient_idx on public.visits(patient_id, created_at desc);
create index if not exists visits_provider_idx on public.visits(provider_id, created_at desc);
create index if not exists visits_status_idx on public.visits(status);
