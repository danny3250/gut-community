create extension if not exists pgcrypto;

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  overall_feeling integer not null check (overall_feeling between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists daily_checkins_user_date_key
  on public.daily_checkins(user_id, checkin_date);
create index if not exists daily_checkins_user_id_idx
  on public.daily_checkins(user_id);

create table if not exists public.symptoms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null
);

create unique index if not exists symptoms_slug_key on public.symptoms(slug);

create table if not exists public.checkin_symptoms (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.daily_checkins(id) on delete cascade,
  symptom_id uuid not null references public.symptoms(id) on delete cascade,
  severity integer not null check (severity between 1 and 5)
);

create unique index if not exists checkin_symptoms_checkin_symptom_key
  on public.checkin_symptoms(checkin_id, symptom_id);
create index if not exists checkin_symptoms_symptom_id_idx
  on public.checkin_symptoms(symptom_id);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null
);

create unique index if not exists foods_slug_key on public.foods(slug);

create table if not exists public.checkin_foods (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.daily_checkins(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  quantity text,
  notes text
);

create unique index if not exists checkin_foods_checkin_food_key
  on public.checkin_foods(checkin_id, food_id);
create index if not exists checkin_foods_food_id_idx
  on public.checkin_foods(food_id);

create table if not exists public.lifestyle_metrics (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null unique references public.daily_checkins(id) on delete cascade,
  sleep_hours numeric,
  stress_level integer check (stress_level between 1 and 5),
  water_intake text
);

create or replace function public.can_access_checkin(target_checkin_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.daily_checkins dc
    where dc.id = target_checkin_id
      and (
        public.is_admin_role()
        or dc.user_id = auth.uid()
        or exists (
          select 1
          from public.patients pa
          join public.appointments a on a.patient_id = pa.id
          where pa.user_id = dc.user_id
            and a.provider_id = public.current_provider_id()
        )
      )
  );
$$;

alter table if exists public.daily_checkins enable row level security;
alter table if exists public.symptoms enable row level security;
alter table if exists public.checkin_symptoms enable row level security;
alter table if exists public.foods enable row level security;
alter table if exists public.checkin_foods enable row level security;
alter table if exists public.lifestyle_metrics enable row level security;

drop policy if exists "daily_checkins_select_own_provider_admin" on public.daily_checkins;
create policy "daily_checkins_select_own_provider_admin"
on public.daily_checkins
for select
using (
  public.is_admin_role()
  or user_id = auth.uid()
  or exists (
    select 1
    from public.patients pa
    join public.appointments a on a.patient_id = pa.id
    where pa.user_id = daily_checkins.user_id
      and a.provider_id = public.current_provider_id()
  )
);

drop policy if exists "daily_checkins_insert_own_or_admin" on public.daily_checkins;
create policy "daily_checkins_insert_own_or_admin"
on public.daily_checkins
for insert
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "daily_checkins_update_own_or_admin" on public.daily_checkins;
create policy "daily_checkins_update_own_or_admin"
on public.daily_checkins
for update
using (
  public.is_admin_role()
  or user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "symptoms_public_read" on public.symptoms;
create policy "symptoms_public_read"
on public.symptoms
for select
using (auth.uid() is not null or public.is_admin_role());

drop policy if exists "foods_public_read" on public.foods;
create policy "foods_public_read"
on public.foods
for select
using (auth.uid() is not null or public.is_admin_role());

drop policy if exists "checkin_symptoms_select_related" on public.checkin_symptoms;
create policy "checkin_symptoms_select_related"
on public.checkin_symptoms
for select
using (public.can_access_checkin(checkin_id));

drop policy if exists "checkin_symptoms_insert_own" on public.checkin_symptoms;
create policy "checkin_symptoms_insert_own"
on public.checkin_symptoms
for insert
with check (public.can_access_checkin(checkin_id));

drop policy if exists "checkin_symptoms_update_own" on public.checkin_symptoms;
create policy "checkin_symptoms_update_own"
on public.checkin_symptoms
for update
using (public.can_access_checkin(checkin_id))
with check (public.can_access_checkin(checkin_id));

drop policy if exists "checkin_symptoms_delete_own" on public.checkin_symptoms;
create policy "checkin_symptoms_delete_own"
on public.checkin_symptoms
for delete
using (public.can_access_checkin(checkin_id));

drop policy if exists "checkin_foods_select_related" on public.checkin_foods;
create policy "checkin_foods_select_related"
on public.checkin_foods
for select
using (public.can_access_checkin(checkin_id));

drop policy if exists "checkin_foods_insert_own" on public.checkin_foods;
create policy "checkin_foods_insert_own"
on public.checkin_foods
for insert
with check (public.can_access_checkin(checkin_id));

drop policy if exists "checkin_foods_update_own" on public.checkin_foods;
create policy "checkin_foods_update_own"
on public.checkin_foods
for update
using (public.can_access_checkin(checkin_id))
with check (public.can_access_checkin(checkin_id));

drop policy if exists "checkin_foods_delete_own" on public.checkin_foods;
create policy "checkin_foods_delete_own"
on public.checkin_foods
for delete
using (public.can_access_checkin(checkin_id));

drop policy if exists "lifestyle_metrics_select_related" on public.lifestyle_metrics;
create policy "lifestyle_metrics_select_related"
on public.lifestyle_metrics
for select
using (public.can_access_checkin(checkin_id));

drop policy if exists "lifestyle_metrics_insert_own" on public.lifestyle_metrics;
create policy "lifestyle_metrics_insert_own"
on public.lifestyle_metrics
for insert
with check (public.can_access_checkin(checkin_id));

drop policy if exists "lifestyle_metrics_update_own" on public.lifestyle_metrics;
create policy "lifestyle_metrics_update_own"
on public.lifestyle_metrics
for update
using (public.can_access_checkin(checkin_id))
with check (public.can_access_checkin(checkin_id));

drop policy if exists "lifestyle_metrics_delete_own" on public.lifestyle_metrics;
create policy "lifestyle_metrics_delete_own"
on public.lifestyle_metrics
for delete
using (public.can_access_checkin(checkin_id));

insert into public.symptoms (name, slug)
values
  ('Bloating', 'bloating'),
  ('Anxiety', 'anxiety'),
  ('Fatigue', 'fatigue')
on conflict (slug) do update
  set name = excluded.name;

insert into public.foods (name, slug)
values
  ('Dairy', 'dairy'),
  ('Gluten', 'gluten'),
  ('Caffeine', 'caffeine'),
  ('Spinach', 'spinach'),
  ('Chicken', 'chicken')
on conflict (slug) do update
  set name = excluded.name;
