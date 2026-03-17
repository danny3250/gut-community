-- CareBridge provider-verified community responses
-- NOTE:
-- Community responses remain informational and do not replace formal medical consultation.

alter table if exists public.community_replies
  add column if not exists is_provider_response boolean not null default false,
  add column if not exists provider_id uuid references public.providers(id) on delete set null,
  add column if not exists verified_at timestamptz;

create index if not exists community_replies_provider_id_idx
  on public.community_replies(provider_id);

create index if not exists community_posts_topic_idx
  on public.community_posts(topic);

update public.community_replies cr
set
  provider_id = pr.id,
  is_provider_response = true,
  verified_at = coalesce(cr.verified_at, cr.created_at)
from public.providers pr
where pr.user_id = cr.author_user_id
  and (cr.provider_id is null or cr.is_provider_response = false);

create or replace function public.sync_community_reply_provider_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_provider_id uuid;
  author_role text;
begin
  select p.id into matched_provider_id
  from public.providers p
  where p.user_id = new.author_user_id
  limit 1;

  select public.current_app_role() into author_role;

  if matched_provider_id is not null then
    new.provider_id := matched_provider_id;
    new.is_provider_response := true;

    if new.verified_at is null and (tg_op = 'INSERT' or new.verified_at is distinct from old.verified_at) then
      if coalesce(new.verified_at, null) is not null then
        new.verified_at := new.verified_at;
      elsif coalesce(new.is_provider_response, false) then
        new.verified_at := coalesce(new.verified_at, now());
      end if;
    end if;
  elsif author_role not in ('admin', 'organization_owner', 'moderator') then
    new.provider_id := null;
    new.is_provider_response := false;
    new.verified_at := null;
  end if;

  if new.is_provider_response = false then
    new.provider_id := null;
    if author_role not in ('admin', 'organization_owner', 'moderator') then
      new.verified_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_community_reply_provider_metadata on public.community_replies;
create trigger sync_community_reply_provider_metadata
before insert or update on public.community_replies
for each row
execute function public.sync_community_reply_provider_metadata();
