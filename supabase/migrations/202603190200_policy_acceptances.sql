create table if not exists public.user_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_type text not null check (policy_type in ('terms', 'privacy')),
  policy_version text not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  acceptance_source text not null default 'signup',
  ip_address inet null,
  user_agent text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, policy_type, policy_version)
);

create index if not exists user_policy_acceptances_user_id_idx
  on public.user_policy_acceptances (user_id, accepted_at desc);

alter table public.user_policy_acceptances enable row level security;

drop policy if exists "Users can read their own policy acceptances" on public.user_policy_acceptances;
create policy "Users can read their own policy acceptances"
  on public.user_policy_acceptances
  for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can read all policy acceptances" on public.user_policy_acceptances;
create policy "Admins can read all policy acceptances"
  on public.user_policy_acceptances
  for select
  using (public.current_app_role() in ('admin', 'organization_owner', 'support_staff'));

