alter table if exists public.message_conversations
  add column if not exists patient_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists provider_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists subject text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_message_at timestamptz;

alter table if exists public.messages
  add column if not exists read_at timestamptz;

create index if not exists message_conversations_patient_idx on public.message_conversations(patient_user_id, coalesce(last_message_at, created_at) desc);
create index if not exists message_conversations_provider_idx on public.message_conversations(provider_user_id, coalesce(last_message_at, created_at) desc);
create unique index if not exists message_conversations_appointment_unique
  on public.message_conversations(appointment_id)
  where appointment_id is not null;
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index if not exists messages_recipient_read_idx on public.messages(recipient_user_id, read_at, created_at desc);

update public.message_conversations mc
set
  updated_at = coalesce((
    select max(m.created_at)
    from public.messages m
    where m.conversation_id = mc.id
  ), mc.updated_at, mc.created_at),
  last_message_at = coalesce((
    select max(m.created_at)
    from public.messages m
    where m.conversation_id = mc.id
  ), mc.last_message_at);

create or replace function public.can_access_message_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_conversations mc
    where mc.id = target_conversation_id
      and (
        public.is_admin_role()
        or mc.patient_user_id = auth.uid()
        or mc.provider_user_id = auth.uid()
      )
  );
$$;

drop policy if exists "messages_select_participant_or_admin" on public.messages;
create policy "messages_select_participant_or_admin"
on public.messages
for select
using (
  public.is_admin_role()
  or public.can_access_message_conversation(conversation_id)
);

drop policy if exists "messages_insert_sender_or_admin" on public.messages;
create policy "messages_insert_sender_or_admin"
on public.messages
for insert
with check (
  public.is_admin_role()
  or (
    sender_user_id = auth.uid()
    and public.can_access_message_conversation(conversation_id)
  )
);

drop policy if exists "messages_update_sender_or_admin" on public.messages;
create policy "messages_update_participant_or_admin"
on public.messages
for update
using (
  public.is_admin_role()
  or public.can_access_message_conversation(conversation_id)
)
with check (
  public.is_admin_role()
  or public.can_access_message_conversation(conversation_id)
);

drop policy if exists "message_conversations_select_participant_or_admin" on public.message_conversations;
create policy "message_conversations_select_participant_or_admin"
on public.message_conversations
for select
using (
  public.is_admin_role()
  or patient_user_id = auth.uid()
  or provider_user_id = auth.uid()
);

drop policy if exists "message_conversations_insert_authenticated" on public.message_conversations;
create policy "message_conversations_insert_participant_or_admin"
on public.message_conversations
for insert
with check (
  public.is_admin_role()
  or patient_user_id = auth.uid()
  or provider_user_id = auth.uid()
);

drop policy if exists "message_conversations_update_participant_or_admin" on public.message_conversations;
create policy "message_conversations_update_participant_or_admin"
on public.message_conversations
for update
using (
  public.is_admin_role()
  or patient_user_id = auth.uid()
  or provider_user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or patient_user_id = auth.uid()
  or provider_user_id = auth.uid()
);
