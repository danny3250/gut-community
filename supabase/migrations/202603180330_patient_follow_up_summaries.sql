create table if not exists public.patient_follow_up_summaries (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  visit_id uuid null references public.visits(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  follow_up_title text null,
  follow_up_summary text not null default '',
  follow_up_instructions text null,
  what_to_track text null,
  recommended_next_step text null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz null,
  created_by_user_id uuid null references auth.users(id) on delete set null,
  last_edited_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (appointment_id)
);

create index if not exists patient_follow_up_summaries_patient_idx
  on public.patient_follow_up_summaries (patient_id, published_at desc, updated_at desc);

create index if not exists patient_follow_up_summaries_provider_idx
  on public.patient_follow_up_summaries (provider_id, updated_at desc);

create or replace function public.set_patient_follow_up_summaries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_patient_follow_up_summaries_updated_at on public.patient_follow_up_summaries;
create trigger set_patient_follow_up_summaries_updated_at
before update on public.patient_follow_up_summaries
for each row
execute function public.set_patient_follow_up_summaries_updated_at();

alter table public.patient_follow_up_summaries enable row level security;

drop policy if exists "Providers can manage their patient follow ups" on public.patient_follow_up_summaries;
create policy "Providers can manage their patient follow ups"
on public.patient_follow_up_summaries
for all
using (
  exists (
    select 1
    from public.providers
    where providers.id = patient_follow_up_summaries.provider_id
      and providers.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.providers
    where providers.id = patient_follow_up_summaries.provider_id
      and providers.user_id = auth.uid()
  )
);

drop policy if exists "Patients can view published follow ups" on public.patient_follow_up_summaries;
create policy "Patients can view published follow ups"
on public.patient_follow_up_summaries
for select
using (
  status = 'published'
  and exists (
    select 1
    from public.patients
    where patients.id = patient_follow_up_summaries.patient_id
      and patients.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage patient follow ups" on public.patient_follow_up_summaries;
create policy "Admins can manage patient follow ups"
on public.patient_follow_up_summaries
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
