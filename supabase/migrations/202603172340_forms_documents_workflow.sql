alter table if exists public.intake_forms
  add column if not exists status text not null default 'submitted',
  add column if not exists submitted_at timestamptz,
  add column if not exists version text,
  add column if not exists completed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_user_id uuid references auth.users(id) on delete set null;

alter table if exists public.documents
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists file_size_bytes bigint;

create index if not exists intake_forms_patient_appointment_idx on public.intake_forms(patient_id, appointment_id, updated_at desc);
create index if not exists intake_forms_appointment_idx on public.intake_forms(appointment_id, updated_at desc);
create index if not exists documents_patient_appointment_idx on public.documents(patient_id, appointment_id, created_at desc);
create index if not exists documents_appointment_idx on public.documents(appointment_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;
