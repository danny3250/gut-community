create table if not exists public.community_thread_votes (
  user_id uuid not null,
  thread_source text not null check (thread_source in ('community', 'legacy_forum')),
  thread_id uuid not null,
  vote_value smallint not null check (vote_value in (-1, 1)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, thread_source, thread_id)
);

create table if not exists public.community_reply_votes (
  user_id uuid not null,
  reply_source text not null check (reply_source in ('community', 'legacy_forum')),
  reply_id uuid not null,
  vote_value smallint not null check (vote_value in (-1, 1)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, reply_source, reply_id)
);

create table if not exists public.community_saved_threads (
  user_id uuid not null,
  thread_source text not null check (thread_source in ('community', 'legacy_forum')),
  thread_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, thread_source, thread_id)
);

create index if not exists community_thread_votes_lookup_idx
  on public.community_thread_votes (thread_source, thread_id);

create index if not exists community_reply_votes_lookup_idx
  on public.community_reply_votes (reply_source, reply_id);

create index if not exists community_saved_threads_lookup_idx
  on public.community_saved_threads (user_id, thread_source, thread_id);

create or replace function public.touch_community_engagement_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists touch_community_thread_votes_updated_at on public.community_thread_votes;
create trigger touch_community_thread_votes_updated_at
before update on public.community_thread_votes
for each row
execute function public.touch_community_engagement_updated_at();

drop trigger if exists touch_community_reply_votes_updated_at on public.community_reply_votes;
create trigger touch_community_reply_votes_updated_at
before update on public.community_reply_votes
for each row
execute function public.touch_community_engagement_updated_at();

alter table public.community_thread_votes enable row level security;
alter table public.community_reply_votes enable row level security;
alter table public.community_saved_threads enable row level security;

drop policy if exists "Public can read community thread vote totals" on public.community_thread_votes;
create policy "Public can read community thread vote totals"
on public.community_thread_votes
for select
using (true);

drop policy if exists "Authenticated users manage own community thread votes" on public.community_thread_votes;
create policy "Authenticated users manage own community thread votes"
on public.community_thread_votes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Public can read community reply vote totals" on public.community_reply_votes;
create policy "Public can read community reply vote totals"
on public.community_reply_votes
for select
using (true);

drop policy if exists "Authenticated users manage own community reply votes" on public.community_reply_votes;
create policy "Authenticated users manage own community reply votes"
on public.community_reply_votes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users read own saved threads" on public.community_saved_threads;
create policy "Users read own saved threads"
on public.community_saved_threads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users manage own saved threads" on public.community_saved_threads;
create policy "Users manage own saved threads"
on public.community_saved_threads
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
