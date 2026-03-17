create table if not exists public.provider_visit_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  status text not null default 'draft',
  subject text,
  note_body text not null default '',
  structured_notes jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null,
  last_edited_by_user_id uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  constraint provider_visit_notes_status_check check (status in ('draft', 'finalized'))
);

create unique index if not exists provider_visit_notes_provider_appointment_idx
  on public.provider_visit_notes(provider_id, appointment_id);
create index if not exists provider_visit_notes_visit_idx
  on public.provider_visit_notes(visit_id);
create index if not exists provider_visit_notes_patient_idx
  on public.provider_visit_notes(patient_id, updated_at desc);
create index if not exists provider_visit_notes_provider_idx
  on public.provider_visit_notes(provider_id, updated_at desc);
create index if not exists provider_visit_notes_status_idx
  on public.provider_visit_notes(status);

alter table public.provider_visit_notes enable row level security;

drop policy if exists "provider_visit_notes_select_provider_or_admin" on public.provider_visit_notes;
create policy "provider_visit_notes_select_provider_or_admin"
on public.provider_visit_notes
for select
using (
  public.is_admin_role()
  or provider_id = public.current_provider_id()
);

drop policy if exists "provider_visit_notes_insert_provider_or_admin" on public.provider_visit_notes;
create policy "provider_visit_notes_insert_provider_or_admin"
on public.provider_visit_notes
for insert
with check (
  public.is_admin_role()
  or (
    public.provider_visit_notes.provider_id = public.current_provider_id()
    and exists (
      select 1
      from public.appointments a
      where a.id = public.provider_visit_notes.appointment_id
        and a.provider_id = public.current_provider_id()
        and a.patient_id = public.provider_visit_notes.patient_id
    )
  )
);

drop policy if exists "provider_visit_notes_update_provider_or_admin" on public.provider_visit_notes;
create policy "provider_visit_notes_update_provider_or_admin"
on public.provider_visit_notes
for update
using (
  public.is_admin_role()
  or public.provider_visit_notes.provider_id = public.current_provider_id()
)
with check (
  public.is_admin_role()
  or (
    public.provider_visit_notes.provider_id = public.current_provider_id()
    and exists (
      select 1
      from public.appointments a
      where a.id = public.provider_visit_notes.appointment_id
        and a.provider_id = public.current_provider_id()
        and a.patient_id = public.provider_visit_notes.patient_id
    )
  )
);

drop policy if exists "provider_visit_notes_delete_provider_or_admin" on public.provider_visit_notes;
create policy "provider_visit_notes_delete_provider_or_admin"
on public.provider_visit_notes
for delete
using (
  public.is_admin_role()
  or provider_id = public.current_provider_id()
);
