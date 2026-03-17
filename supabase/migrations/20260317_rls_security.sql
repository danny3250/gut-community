-- CareBridge Row Level Security foundation
-- NOTE:
-- This migration enables RLS and adds ownership / role-based policies.
-- It improves the security posture of the database but does NOT by itself
-- make the platform HIPAA compliant or production-ready for PHI.
-- TODO: review these policies alongside application flows, storage rules,
-- audit requirements, and legal/compliance controls before production use.

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role::text
      from public.profiles p
      where p.id = auth.uid()
         or p.user_id = auth.uid()
      limit 1
    ),
    ''
  );
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'organization_owner');
$$;

create or replace function public.is_staff_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'organization_owner', 'support_staff');
$$;

create or replace function public.current_patient_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.patients p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_provider_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.providers p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_role()
    or target_patient_id = public.current_patient_id()
    or exists (
      select 1
      from public.appointments a
      where a.patient_id = target_patient_id
        and a.provider_id = public.current_provider_id()
    );
$$;

create or replace function public.can_access_provider(target_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_role()
    or target_provider_id = public.current_provider_id();
$$;

create or replace function public.can_access_appointment(target_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    where a.id = target_appointment_id
      and (
        public.is_admin_role()
        or a.patient_id = public.current_patient_id()
        or a.provider_id = public.current_provider_id()
      )
  );
$$;

create or replace function public.get_public_provider_booked_slots(
  target_provider_id uuid,
  from_iso timestamptz default null
)
returns table (
  id uuid,
  provider_id uuid,
  status text,
  appointment_type text,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  visit_vendor text,
  visit_external_id text,
  join_url_placeholder text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.provider_id,
    a.status,
    a.appointment_type,
    a.start_time,
    a.end_time,
    a.timezone,
    a.visit_vendor,
    a.visit_external_id,
    a.join_url_placeholder
  from public.appointments a
  where a.provider_id = target_provider_id
    and a.status in ('requested', 'confirmed')
    and (from_iso is null or a.start_time >= from_iso)
  order by a.start_time asc;
$$;

grant execute on function public.get_public_provider_booked_slots(uuid, timestamptz) to anon, authenticated;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin_role() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null then
      if coalesce(new.role::text, 'patient') <> 'patient' then
        raise exception 'Only admins can assign non-patient roles.';
      end if;

      return new;
    end if;

    if new.id is distinct from auth.uid() and coalesce(new.user_id, new.id) is distinct from auth.uid() then
      raise exception 'Profiles can only be created for the authenticated user.';
    end if;

    if coalesce(new.role::text, 'patient') <> 'patient' then
      raise exception 'Only admins can assign non-patient roles.';
    end if;

    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed.';
  end if;

  if coalesce(new.user_id, new.id) is distinct from coalesce(old.user_id, old.id) then
    raise exception 'Profile user mapping cannot be changed.';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only admins can change roles.';
  end if;

  return new;
end;
$$;

alter table if exists public.profiles enable row level security;
alter table if exists public.patients enable row level security;
alter table if exists public.providers enable row level security;
alter table if exists public.appointments enable row level security;
alter table if exists public.visits enable row level security;
alter table if exists public.documents enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.message_conversations enable row level security;
alter table if exists public.intake_forms enable row level security;
alter table if exists public.consents enable row level security;
alter table if exists public.audit_logs enable row level security;
alter table if exists public.provider_availability_windows enable row level security;
alter table if exists public.community_posts enable row level security;
alter table if exists public.community_replies enable row level security;
alter table if exists public.forum_posts enable row level security;
alter table if exists public.forum_comments enable row level security;
alter table if exists public.content_resources enable row level security;
alter table if exists public.recipes enable row level security;
alter table if exists public.recipe_tags enable row level security;
alter table if exists public.recipe_steps enable row level security;
alter table if exists public.recipe_ingredients enable row level security;
alter table if exists public.recipe_tag_map enable row level security;

drop trigger if exists protect_profile_role_changes on public.profiles;
create trigger protect_profile_role_changes
before insert or update on public.profiles
for each row
execute function public.prevent_profile_role_escalation();

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (
  public.is_admin_role()
  or id = auth.uid()
  or user_id = auth.uid()
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (
  public.is_admin_role()
  or id = auth.uid()
  or user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or id = auth.uid()
  or user_id = auth.uid()
);

drop policy if exists "profiles_insert_own_or_admin" on public.profiles;
create policy "profiles_insert_own_or_admin"
on public.profiles
for insert
with check (
  public.is_admin_role()
  or id = auth.uid()
  or user_id = auth.uid()
);

drop policy if exists "patients_select_own_provider_admin" on public.patients;
create policy "patients_select_own_provider_admin"
on public.patients
for select
using (public.can_access_patient(id));

drop policy if exists "patients_insert_own_or_admin" on public.patients;
create policy "patients_insert_own_or_admin"
on public.patients
for insert
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "patients_update_own_or_admin" on public.patients;
create policy "patients_update_own_or_admin"
on public.patients
for update
using (
  public.is_admin_role()
  or user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "providers_public_read" on public.providers;
create policy "providers_public_read"
on public.providers
for select
using (true);

drop policy if exists "providers_insert_own_or_admin" on public.providers;
create policy "providers_insert_own_or_admin"
on public.providers
for insert
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "providers_update_own_or_admin" on public.providers;
create policy "providers_update_own_or_admin"
on public.providers
for update
using (
  public.is_admin_role()
  or user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or user_id = auth.uid()
);

drop policy if exists "appointments_select_related_or_admin" on public.appointments;
create policy "appointments_select_related_or_admin"
on public.appointments
for select
using (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
);

drop policy if exists "appointments_insert_patient_or_admin" on public.appointments;
create policy "appointments_insert_patient_or_admin"
on public.appointments
for insert
with check (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
);

drop policy if exists "appointments_update_provider_or_admin" on public.appointments;
create policy "appointments_update_provider_or_admin"
on public.appointments
for update
using (
  public.is_admin_role()
  or provider_id = public.current_provider_id()
)
with check (
  public.is_admin_role()
  or provider_id = public.current_provider_id()
);

drop policy if exists "visits_select_related_or_admin" on public.visits;
create policy "visits_select_related_or_admin"
on public.visits
for select
using (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
);

drop policy if exists "visits_insert_related_or_admin" on public.visits;
create policy "visits_insert_related_or_admin"
on public.visits
for insert
with check (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
);

drop policy if exists "visits_update_related_or_admin" on public.visits;
create policy "visits_update_related_or_admin"
on public.visits
for update
using (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
)
with check (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or provider_id = public.current_provider_id()
);

drop policy if exists "documents_select_related_or_admin" on public.documents;
create policy "documents_select_related_or_admin"
on public.documents
for select
using (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
);

drop policy if exists "documents_insert_related_or_admin" on public.documents;
create policy "documents_insert_related_or_admin"
on public.documents
for insert
with check (
  public.is_admin_role()
  or (
    uploaded_by_user_id = auth.uid()
    and (
      patient_id = public.current_patient_id()
      or public.can_access_patient(patient_id)
    )
  )
);

drop policy if exists "documents_update_related_or_admin" on public.documents;
create policy "documents_update_related_or_admin"
on public.documents
for update
using (
  public.is_admin_role()
  or uploaded_by_user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or uploaded_by_user_id = auth.uid()
);

drop policy if exists "messages_select_participant_or_admin" on public.messages;
create policy "messages_select_participant_or_admin"
on public.messages
for select
using (
  public.is_admin_role()
  or sender_user_id = auth.uid()
  or recipient_user_id = auth.uid()
);

drop policy if exists "messages_insert_sender_or_admin" on public.messages;
create policy "messages_insert_sender_or_admin"
on public.messages
for insert
with check (
  public.is_admin_role()
  or sender_user_id = auth.uid()
);

drop policy if exists "messages_update_sender_or_admin" on public.messages;
create policy "messages_update_sender_or_admin"
on public.messages
for update
using (
  public.is_admin_role()
  or sender_user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or sender_user_id = auth.uid()
);

drop policy if exists "message_conversations_select_participant_or_admin" on public.message_conversations;
create policy "message_conversations_select_participant_or_admin"
on public.message_conversations
for select
using (
  public.is_admin_role()
  or exists (
    select 1
    from public.messages m
    where m.conversation_id = id
      and (m.sender_user_id = auth.uid() or m.recipient_user_id = auth.uid())
  )
);

drop policy if exists "message_conversations_insert_authenticated" on public.message_conversations;
create policy "message_conversations_insert_authenticated"
on public.message_conversations
for insert
with check (
  auth.uid() is not null
);

drop policy if exists "intake_forms_select_related_or_admin" on public.intake_forms;
create policy "intake_forms_select_related_or_admin"
on public.intake_forms
for select
using (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
);

drop policy if exists "intake_forms_insert_related_or_admin" on public.intake_forms;
create policy "intake_forms_insert_related_or_admin"
on public.intake_forms
for insert
with check (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
);

drop policy if exists "intake_forms_update_related_or_admin" on public.intake_forms;
create policy "intake_forms_update_related_or_admin"
on public.intake_forms
for update
using (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
)
with check (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
);

drop policy if exists "consents_select_related_or_admin" on public.consents;
create policy "consents_select_related_or_admin"
on public.consents
for select
using (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
  or public.can_access_patient(patient_id)
);

drop policy if exists "consents_insert_own_or_admin" on public.consents;
create policy "consents_insert_own_or_admin"
on public.consents
for insert
with check (
  public.is_admin_role()
  or patient_id = public.current_patient_id()
);

drop policy if exists "audit_logs_admin_only_select" on public.audit_logs;
create policy "audit_logs_admin_only_select"
on public.audit_logs
for select
using (public.is_staff_role());

drop policy if exists "audit_logs_admin_only_insert" on public.audit_logs;
create policy "audit_logs_admin_only_insert"
on public.audit_logs
for insert
with check (
  public.is_staff_role()
  or (
    auth.uid() is not null
    and actor_user_id = auth.uid()
    and coalesce(actor_role, public.current_app_role()) = public.current_app_role()
  )
);

drop policy if exists "audit_logs_admin_only_update" on public.audit_logs;
create policy "audit_logs_admin_only_update"
on public.audit_logs
for update
using (public.is_staff_role())
with check (public.is_staff_role());

drop policy if exists "provider_availability_public_read" on public.provider_availability_windows;
create policy "provider_availability_public_read"
on public.provider_availability_windows
for select
using (true);

drop policy if exists "provider_availability_insert_own_or_admin" on public.provider_availability_windows;
create policy "provider_availability_insert_own_or_admin"
on public.provider_availability_windows
for insert
with check (
  public.is_admin_role()
  or provider_id = public.current_provider_id()
);

drop policy if exists "provider_availability_update_own_or_admin" on public.provider_availability_windows;
create policy "provider_availability_update_own_or_admin"
on public.provider_availability_windows
for update
using (
  public.is_admin_role()
  or provider_id = public.current_provider_id()
)
with check (
  public.is_admin_role()
  or provider_id = public.current_provider_id()
);

drop policy if exists "provider_availability_delete_own_or_admin" on public.provider_availability_windows;
create policy "provider_availability_delete_own_or_admin"
on public.provider_availability_windows
for delete
using (
  public.is_admin_role()
  or provider_id = public.current_provider_id()
);

drop policy if exists "community_posts_public_or_member_read" on public.community_posts;
create policy "community_posts_public_or_member_read"
on public.community_posts
for select
using (
  visibility = 'public'
  or auth.uid() is not null
  or public.is_admin_role()
);

drop policy if exists "community_posts_insert_own_or_admin" on public.community_posts;
create policy "community_posts_insert_own_or_admin"
on public.community_posts
for insert
with check (
  public.is_admin_role()
  or author_user_id = auth.uid()
);

drop policy if exists "community_posts_update_own_mod_or_admin" on public.community_posts;
create policy "community_posts_update_own_mod_or_admin"
on public.community_posts
for update
using (
  public.is_admin_role()
  or public.current_app_role() = 'moderator'
  or author_user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or public.current_app_role() = 'moderator'
  or author_user_id = auth.uid()
);

drop policy if exists "community_replies_public_or_member_read" on public.community_replies;
create policy "community_replies_public_or_member_read"
on public.community_replies
for select
using (
  auth.uid() is not null
  or public.is_admin_role()
  or exists (
    select 1
    from public.community_posts cp
    where cp.id = post_id
      and cp.visibility = 'public'
  )
);

drop policy if exists "community_replies_insert_own_or_admin" on public.community_replies;
create policy "community_replies_insert_own_or_admin"
on public.community_replies
for insert
with check (
  public.is_admin_role()
  or author_user_id = auth.uid()
);

drop policy if exists "community_replies_update_own_mod_or_admin" on public.community_replies;
create policy "community_replies_update_own_mod_or_admin"
on public.community_replies
for update
using (
  public.is_admin_role()
  or public.current_app_role() = 'moderator'
  or author_user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or public.current_app_role() = 'moderator'
  or author_user_id = auth.uid()
);

drop policy if exists "forum_posts_authenticated_read" on public.forum_posts;
create policy "forum_posts_authenticated_read"
on public.forum_posts
for select
using (
  auth.uid() is not null
  or public.is_admin_role()
);

drop policy if exists "forum_posts_insert_own_or_admin" on public.forum_posts;
create policy "forum_posts_insert_own_or_admin"
on public.forum_posts
for insert
with check (
  public.is_admin_role()
  or created_by = auth.uid()
);

drop policy if exists "forum_posts_update_own_mod_or_admin" on public.forum_posts;
create policy "forum_posts_update_own_mod_or_admin"
on public.forum_posts
for update
using (
  public.is_admin_role()
  or public.current_app_role() = 'moderator'
  or created_by = auth.uid()
)
with check (
  public.is_admin_role()
  or public.current_app_role() = 'moderator'
  or created_by = auth.uid()
);

drop policy if exists "forum_comments_authenticated_read" on public.forum_comments;
create policy "forum_comments_authenticated_read"
on public.forum_comments
for select
using (
  auth.uid() is not null
  or public.is_admin_role()
);

drop policy if exists "forum_comments_insert_own_or_admin" on public.forum_comments;
create policy "forum_comments_insert_own_or_admin"
on public.forum_comments
for insert
with check (
  public.is_admin_role()
  or created_by = auth.uid()
);

drop policy if exists "forum_comments_update_own_mod_or_admin" on public.forum_comments;
create policy "forum_comments_update_own_mod_or_admin"
on public.forum_comments
for update
using (
  public.is_admin_role()
  or public.current_app_role() = 'moderator'
  or created_by = auth.uid()
)
with check (
  public.is_admin_role()
  or public.current_app_role() = 'moderator'
  or created_by = auth.uid()
);

drop policy if exists "content_resources_public_read" on public.content_resources;
create policy "content_resources_public_read"
on public.content_resources
for select
using (
  visibility = 'public'
  or public.is_admin_role()
  or author_user_id = auth.uid()
);

drop policy if exists "content_resources_admin_or_author_write" on public.content_resources;
create policy "content_resources_admin_or_author_write"
on public.content_resources
for all
using (
  public.is_admin_role()
  or author_user_id = auth.uid()
)
with check (
  public.is_admin_role()
  or author_user_id = auth.uid()
);

drop policy if exists "recipes_public_published_read" on public.recipes;
create policy "recipes_public_published_read"
on public.recipes
for select
using (
  coalesce(is_public, false) = true
  or status = 'published'
  or created_by = auth.uid()
  or public.is_admin_role()
);

drop policy if exists "recipes_owner_or_admin_write" on public.recipes;
create policy "recipes_owner_or_admin_write"
on public.recipes
for all
using (
  public.is_admin_role()
  or created_by = auth.uid()
)
with check (
  public.is_admin_role()
  or created_by = auth.uid()
);

drop policy if exists "recipe_tags_public_read" on public.recipe_tags;
create policy "recipe_tags_public_read"
on public.recipe_tags
for select
using (true);

drop policy if exists "recipe_steps_public_read" on public.recipe_steps;
create policy "recipe_steps_public_read"
on public.recipe_steps
for select
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (
        coalesce(r.is_public, false) = true
        or r.status = 'published'
        or r.created_by = auth.uid()
        or public.is_admin_role()
      )
  )
);

drop policy if exists "recipe_steps_owner_or_admin_write" on public.recipe_steps;
create policy "recipe_steps_owner_or_admin_write"
on public.recipe_steps
for all
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (public.is_admin_role() or r.created_by = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (public.is_admin_role() or r.created_by = auth.uid())
  )
);

drop policy if exists "recipe_ingredients_public_read" on public.recipe_ingredients;
create policy "recipe_ingredients_public_read"
on public.recipe_ingredients
for select
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (
        coalesce(r.is_public, false) = true
        or r.status = 'published'
        or r.created_by = auth.uid()
        or public.is_admin_role()
      )
  )
);

drop policy if exists "recipe_ingredients_owner_or_admin_write" on public.recipe_ingredients;
create policy "recipe_ingredients_owner_or_admin_write"
on public.recipe_ingredients
for all
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (public.is_admin_role() or r.created_by = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (public.is_admin_role() or r.created_by = auth.uid())
  )
);

drop policy if exists "recipe_tag_map_public_read" on public.recipe_tag_map;
create policy "recipe_tag_map_public_read"
on public.recipe_tag_map
for select
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (
        coalesce(r.is_public, false) = true
        or r.status = 'published'
        or r.created_by = auth.uid()
        or public.is_admin_role()
      )
  )
);

drop policy if exists "recipe_tag_map_owner_or_admin_write" on public.recipe_tag_map;
create policy "recipe_tag_map_owner_or_admin_write"
on public.recipe_tag_map
for all
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (public.is_admin_role() or r.created_by = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (public.is_admin_role() or r.created_by = auth.uid())
  )
);
