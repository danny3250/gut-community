create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  category text not null default 'medical',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint specialties_slug_key unique (slug)
);

create unique index if not exists specialties_name_category_key
  on public.specialties(name, category);

create table if not exists public.provider_specialties (
  provider_id uuid not null references public.providers(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (provider_id, specialty_id)
);

create table if not exists public.provider_condition_focus (
  provider_id uuid not null references public.providers(id) on delete cascade,
  condition_id uuid not null references public.conditions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (provider_id, condition_id)
);

create index if not exists provider_specialties_specialty_id_idx
  on public.provider_specialties(specialty_id);

create index if not exists provider_condition_focus_condition_id_idx
  on public.provider_condition_focus(condition_id);

alter table public.provider_applications
  add column if not exists specialty_slugs text[] not null default '{}',
  add column if not exists condition_focus_slugs text[] not null default '{}';

alter table public.provider_specialties enable row level security;
alter table public.provider_condition_focus enable row level security;

drop policy if exists "provider_specialties_public_select" on public.provider_specialties;
create policy "provider_specialties_public_select"
on public.provider_specialties
for select
using (
  exists (
    select 1
    from public.providers p
    where p.id = provider_specialties.provider_id
      and p.verification_status = 'verified'
  )
  or public.is_admin_role()
);

drop policy if exists "provider_condition_focus_public_select" on public.provider_condition_focus;
create policy "provider_condition_focus_public_select"
on public.provider_condition_focus
for select
using (
  exists (
    select 1
    from public.providers p
    where p.id = provider_condition_focus.provider_id
      and p.verification_status = 'verified'
  )
  or public.is_admin_role()
);

drop policy if exists "provider_specialties_admin_write" on public.provider_specialties;
create policy "provider_specialties_admin_write"
on public.provider_specialties
for all
using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "provider_condition_focus_admin_write" on public.provider_condition_focus;
create policy "provider_condition_focus_admin_write"
on public.provider_condition_focus
for all
using (public.is_admin_role())
with check (public.is_admin_role());

insert into public.specialties (name, slug, category)
values
  ('Primary Care', 'primary-care', 'medical'),
  ('Family Medicine', 'family-medicine', 'medical'),
  ('Pediatrics', 'pediatrics', 'medical'),
  ('Gastroenterology', 'gastroenterology', 'medical'),
  ('Psychiatry', 'psychiatry', 'behavioral'),
  ('Therapy and Counseling', 'therapy-counseling', 'behavioral'),
  ('Cardiology', 'cardiology', 'medical'),
  ('Endocrinology', 'endocrinology', 'medical'),
  ('Dietetics and Nutrition', 'dietetics-nutrition', 'wellness'),
  ('Women''s Health', 'womens-health', 'medical'),
  ('Neurology', 'neurology', 'medical'),
  ('Sleep Medicine', 'sleep-medicine', 'medical'),
  ('Pain Management', 'pain-management', 'medical'),
  ('Dermatology', 'dermatology', 'medical')
on conflict (slug) do update
set name = excluded.name,
    category = excluded.category,
    updated_at = now();

insert into public.conditions (name, slug, category)
values
  ('IBS', 'ibs', 'digestive-health'),
  ('GERD', 'gerd', 'digestive-health'),
  ('Crohn''s Disease', 'crohns-disease', 'digestive-health'),
  ('Ulcerative Colitis', 'ulcerative-colitis', 'digestive-health'),
  ('Anxiety', 'anxiety', 'mental-health'),
  ('Depression', 'depression', 'mental-health'),
  ('Hypertension', 'hypertension', 'cardiovascular'),
  ('Heart Health', 'heart-health', 'cardiovascular'),
  ('Diabetes', 'diabetes', 'metabolic-health'),
  ('Weight Management', 'weight-management', 'metabolic-health'),
  ('PCOS', 'pcos', 'womens-health'),
  ('Menopause Support', 'menopause-support', 'womens-health'),
  ('Chronic Pain', 'chronic-pain', 'pain-management'),
  ('Migraines', 'migraines', 'neurology'),
  ('Insomnia', 'insomnia', 'sleep-health')
on conflict (slug) do update
set name = excluded.name,
    category = excluded.category;
