-- CareBridge provider scheduling blocks
-- NOTE:
-- Time blocks remove availability from patient booking while remaining manageable by the provider and authorized admins.

create table if not exists public.provider_time_blocks (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_time_blocks_range_check check (end_time > start_time)
);

create index if not exists provider_time_blocks_provider_start_idx
  on public.provider_time_blocks(provider_id, start_time);

create or replace function public.get_public_provider_time_blocks(
  target_provider_id uuid,
  from_iso timestamptz default null,
  to_iso timestamptz default null
)
returns table (
  id uuid,
  provider_id uuid,
  start_time timestamptz,
  end_time timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ptb.id,
    ptb.provider_id,
    ptb.start_time,
    ptb.end_time
  from public.provider_time_blocks ptb
  where ptb.provider_id = target_provider_id
    and (from_iso is null or ptb.end_time > from_iso)
    and (to_iso is null or ptb.start_time < to_iso)
  order by ptb.start_time asc;
$$;

grant execute on function public.get_public_provider_time_blocks(uuid, timestamptz, timestamptz) to anon, authenticated;

alter table if exists public.provider_time_blocks enable row level security;

drop policy if exists "provider_time_blocks_public_read" on public.provider_time_blocks;
create policy "provider_time_blocks_public_read"
on public.provider_time_blocks
for select
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
);

drop policy if exists "provider_time_blocks_insert_own_or_admin" on public.provider_time_blocks;
create policy "provider_time_blocks_insert_own_or_admin"
on public.provider_time_blocks
for insert
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
);

drop policy if exists "provider_time_blocks_update_own_or_admin" on public.provider_time_blocks;
create policy "provider_time_blocks_update_own_or_admin"
on public.provider_time_blocks
for update
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
)
with check (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
);

drop policy if exists "provider_time_blocks_delete_own_or_admin" on public.provider_time_blocks;
create policy "provider_time_blocks_delete_own_or_admin"
on public.provider_time_blocks
for delete
using (
  public.is_admin_role()
  or public.can_manage_organization(public.organization_for_provider(provider_id))
  or provider_id = public.current_provider_id()
);
