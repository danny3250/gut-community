create extension if not exists pgcrypto;

alter table if exists public.recipes
  add column if not exists slug text,
  add column if not exists summary text,
  add column if not exists image_url text,
  add column if not exists prep_time_minutes integer,
  add column if not exists cook_time_minutes integer,
  add column if not exists total_time_minutes integer,
  add column if not exists ingredients_raw text,
  add column if not exists instructions_raw text,
  add column if not exists notes text,
  add column if not exists digestion_notes text,
  add column if not exists is_public boolean default false,
  add column if not exists updated_at timestamptz default now();

update public.recipes
set
  summary = coalesce(summary, description),
  image_url = coalesce(image_url, photo_url),
  ingredients_raw = coalesce(ingredients_raw, ingredients),
  instructions_raw = coalesce(instructions_raw, instructions),
  is_public = coalesce(is_public, is_published, status = 'published'),
  updated_at = coalesce(updated_at, created_at, now())
where true;

create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_number integer not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists recipe_steps_recipe_id_idx on public.recipe_steps(recipe_id);
create unique index if not exists recipe_steps_recipe_id_step_number_idx
  on public.recipe_steps(recipe_id, step_number);

alter table if exists public.recipe_ingredients
  add column if not exists sort_order integer,
  add column if not exists raw_text text,
  add column if not exists quantity_numeric numeric,
  add column if not exists quantity_text text,
  add column if not exists ingredient_name text,
  add column if not exists preparation_note text,
  add column if not exists optional_flag boolean default false;

update public.recipe_ingredients
set
  sort_order = coalesce(sort_order, line_no),
  raw_text = coalesce(raw_text, raw_line),
  quantity_numeric = coalesce(quantity_numeric, quantity),
  ingredient_name = coalesce(ingredient_name, item_name),
  preparation_note = coalesce(preparation_note, notes)
where true;

create index if not exists recipe_ingredients_recipe_id_sort_order_idx
  on public.recipe_ingredients(recipe_id, sort_order);

create table if not exists public.recipe_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_tag_map (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id uuid not null references public.recipe_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, tag_id)
);

create index if not exists recipe_tag_map_tag_id_idx on public.recipe_tag_map(tag_id);
