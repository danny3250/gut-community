create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  scheduled_for timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_scheduled_idx
  on public.notifications(user_id, scheduled_for desc, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read, scheduled_for desc);
create index if not exists notifications_type_idx
  on public.notifications(type);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications
for select
using (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "notifications_insert_own_or_admin" on public.notifications;
create policy "notifications_insert_own_or_admin"
on public.notifications
for insert
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications
for update
using (
  public.is_admin_role()
  or user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);
