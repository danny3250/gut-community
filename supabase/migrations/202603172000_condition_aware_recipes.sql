create extension if not exists pgcrypto;

alter table if exists public.recipes
  add column if not exists name text,
  add column if not exists difficulty text,
  add column if not exists why_this_helps text,
  add column if not exists conditions_supported text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists avoids text[] not null default '{}',
  add column if not exists ingredient_ids uuid[] not null default '{}';

update public.recipes
set name = coalesce(name, title)
where name is null;

alter table if exists public.recipe_tags
  add column if not exists slug text;

update public.recipe_tags
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where slug is null;

create unique index if not exists recipe_tags_slug_key on public.recipe_tags(slug);

create table if not exists public.conditions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists conditions_slug_key on public.conditions(slug);
create unique index if not exists conditions_name_category_key on public.conditions(name, category);
create index if not exists conditions_slug_idx on public.conditions(slug);

create table if not exists public.recipe_conditions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  condition_id uuid not null references public.conditions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists recipe_conditions_recipe_condition_key
  on public.recipe_conditions(recipe_id, condition_id);
create index if not exists recipe_conditions_condition_id_idx
  on public.recipe_conditions(condition_id);
create index if not exists recipe_conditions_recipe_id_idx
  on public.recipe_conditions(recipe_id);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists ingredients_slug_key on public.ingredients(slug);

alter table if exists public.recipe_ingredients
  add column if not exists ingredient_id uuid references public.ingredients(id) on delete set null;

create index if not exists recipe_ingredients_ingredient_id_idx
  on public.recipe_ingredients(ingredient_id);
create index if not exists recipe_ingredients_recipe_id_ingredient_id_idx
  on public.recipe_ingredients(recipe_id, ingredient_id);

create table if not exists public.ingredient_avoidance (
  id uuid primary key default gen_random_uuid(),
  condition_id uuid not null references public.conditions(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists ingredient_avoidance_condition_ingredient_key
  on public.ingredient_avoidance(condition_id, ingredient_id);
create index if not exists ingredient_avoidance_condition_id_idx
  on public.ingredient_avoidance(condition_id);
create index if not exists ingredient_avoidance_ingredient_id_idx
  on public.ingredient_avoidance(ingredient_id);

create table if not exists public.nutrients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.recipe_nutrients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  nutrient_id uuid not null references public.nutrients(id) on delete cascade,
  amount numeric,
  created_at timestamptz not null default now()
);

create unique index if not exists recipe_nutrients_recipe_nutrient_key
  on public.recipe_nutrients(recipe_id, nutrient_id);
create index if not exists recipe_nutrients_nutrient_id_idx
  on public.recipe_nutrients(nutrient_id);

create table if not exists public.provider_recipe_links (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  relation_type text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists provider_recipe_links_provider_recipe_relation_key
  on public.provider_recipe_links(provider_id, recipe_id, relation_type);
create index if not exists provider_recipe_links_provider_recipe_idx
  on public.provider_recipe_links(provider_id, recipe_id);
create index if not exists provider_recipe_links_recipe_id_idx
  on public.provider_recipe_links(recipe_id);

create or replace function public.filter_condition_aware_recipes(selected_condition_ids uuid[])
returns table (
  recipe_id uuid,
  recipe_name text,
  recipe_description text,
  recipe_slug text,
  why_this_helps text
)
language sql
stable
security definer
set search_path = public
as $$
  with selected as (
    select unnest(coalesce(selected_condition_ids, '{}'::uuid[])) as condition_id
  ),
  selected_count as (
    select count(*)::integer as total from selected
  ),
  matched_recipes as (
    select rc.recipe_id
    from public.recipe_conditions rc
    join selected s on s.condition_id = rc.condition_id
    group by rc.recipe_id
    having count(distinct rc.condition_id) = (select total from selected_count)
  ),
  avoided_ingredients as (
    select distinct ia.ingredient_id
    from public.ingredient_avoidance ia
    join selected s on s.condition_id = ia.condition_id
  )
  select
    r.id as recipe_id,
    coalesce(r.name, r.title) as recipe_name,
    coalesce(r.summary, r.description) as recipe_description,
    r.slug as recipe_slug,
    r.why_this_helps
  from public.recipes r
  join matched_recipes mr on mr.recipe_id = r.id
  where (select total from selected_count) > 0
    and not exists (
      select 1
      from public.recipe_ingredients ri
      join avoided_ingredients ai on ai.ingredient_id = ri.ingredient_id
      where ri.recipe_id = r.id
    )
  order by coalesce(r.name, r.title) asc;
$$;

grant execute on function public.filter_condition_aware_recipes(uuid[]) to anon, authenticated;

create index if not exists recipes_conditions_supported_gin_idx
  on public.recipes using gin (conditions_supported);

create index if not exists recipes_tags_gin_idx
  on public.recipes using gin (tags);

create index if not exists recipes_ingredient_ids_gin_idx
  on public.recipes using gin (ingredient_ids);

with upsert_conditions as (
  insert into public.conditions (name, category, slug)
  values
    ('IBS', 'gut_health', 'ibs'),
    ('Anxiety', 'mental_health', 'anxiety'),
    ('Hypertension', 'cardiometabolic', 'hypertension')
  on conflict (slug) do update
    set name = excluded.name,
        category = excluded.category
  returning id, slug
),
upsert_ingredients as (
  insert into public.ingredients (name, slug)
  values
    ('Garlic', 'garlic'),
    ('Onion', 'onion'),
    ('Salmon', 'salmon'),
    ('Oats', 'oats'),
    ('Spinach', 'spinach')
  on conflict (slug) do update
    set name = excluded.name
  returning id, slug
),
upsert_tags as (
  insert into public.recipe_tags (name, slug)
  values
    ('low_fodmap', 'low-fodmap'),
    ('anti_inflammatory', 'anti-inflammatory')
  on conflict (slug) do update
    set name = excluded.name
  returning id, name
)
select 1;

update public.recipes
set
  name = seeded.name,
  title = seeded.title,
  summary = seeded.summary,
  description = seeded.description,
  prep_time_minutes = seeded.prep_time_minutes,
  difficulty = seeded.difficulty,
  why_this_helps = seeded.why_this_helps,
  is_public = seeded.is_public,
  is_published = seeded.is_published,
  status = seeded.status,
  ingredients = seeded.ingredients_raw,
  ingredients_raw = seeded.ingredients_raw,
  instructions = seeded.instructions_raw,
  instructions_raw = seeded.instructions_raw
from (
  values
    (
      'ginger-oat-bowl',
      'Ginger Oat Bowl',
      'Ginger Oat Bowl',
      'A warm oat bowl with gentle ingredients and simple prep.',
      'A warm oat bowl with gentle ingredients and simple prep.',
      10,
      'easy',
      'Built around simple oats and ginger-forward flavor without common high-FODMAP triggers.',
      true,
      true,
      'published',
      '1 cup oats' || E'\n' || '1 cup spinach',
      'Cook oats until tender. Fold in spinach at the end and serve warm.'
    ),
    (
      'salmon-spinach-plate',
      'Salmon and Spinach Plate',
      'Salmon and Spinach Plate',
      'A simple protein-forward meal with spinach and easy prep.',
      'A simple protein-forward meal with spinach and easy prep.',
      20,
      'moderate',
      'Pairs omega-3 rich salmon with a straightforward ingredient list that works well for anti-inflammatory meal planning.',
      true,
      true,
      'published',
      '1 salmon fillet' || E'\n' || '2 cups spinach',
      'Roast the salmon until cooked through. Serve with wilted spinach.'
    ),
    (
      'savory-oats-spinach-bowl',
      'Savory Oats and Spinach Bowl',
      'Savory Oats and Spinach Bowl',
      'A quick savory bowl designed for simple prep and steady energy.',
      'A quick savory bowl designed for simple prep and steady energy.',
      15,
      'easy',
      'Uses pantry-friendly ingredients and fiber-rich oats while avoiding garlic and onion for easier filtering.',
      true,
      true,
      'published',
      '1 cup oats' || E'\n' || '2 cups spinach',
      'Cook the oats, season lightly, and stir in spinach before serving.'
    )
) as seeded(
  slug,
  name,
  title,
  summary,
  description,
  prep_time_minutes,
  difficulty,
  why_this_helps,
  is_public,
  is_published,
  status,
  ingredients_raw,
  instructions_raw
)
where public.recipes.slug = seeded.slug;

insert into public.recipes (
  slug,
  name,
  title,
  summary,
  description,
  prep_time_minutes,
  difficulty,
  why_this_helps,
  is_public,
  is_published,
  status,
  created_by,
  ingredients,
  ingredients_raw,
  instructions,
  instructions_raw
)
select
  seeded.slug,
  seeded.name,
  seeded.title,
  seeded.summary,
  seeded.description,
  seeded.prep_time_minutes,
  seeded.difficulty,
  seeded.why_this_helps,
  seeded.is_public,
  seeded.is_published,
  seeded.status,
  seed_author.id,
  seeded.ingredients_raw,
  seeded.ingredients_raw,
  seeded.instructions_raw,
  seeded.instructions_raw
from (
  values
    (
      'ginger-oat-bowl',
      'Ginger Oat Bowl',
      'Ginger Oat Bowl',
      'A warm oat bowl with gentle ingredients and simple prep.',
      'A warm oat bowl with gentle ingredients and simple prep.',
      10,
      'easy',
      'Built around simple oats and ginger-forward flavor without common high-FODMAP triggers.',
      true,
      true,
      'published',
      '1 cup oats' || E'\n' || '1 cup spinach',
      'Cook oats until tender. Fold in spinach at the end and serve warm.'
    ),
    (
      'salmon-spinach-plate',
      'Salmon and Spinach Plate',
      'Salmon and Spinach Plate',
      'A simple protein-forward meal with spinach and easy prep.',
      'A simple protein-forward meal with spinach and easy prep.',
      20,
      'moderate',
      'Pairs omega-3 rich salmon with a straightforward ingredient list that works well for anti-inflammatory meal planning.',
      true,
      true,
      'published',
      '1 salmon fillet' || E'\n' || '2 cups spinach',
      'Roast the salmon until cooked through. Serve with wilted spinach.'
    ),
    (
      'savory-oats-spinach-bowl',
      'Savory Oats and Spinach Bowl',
      'Savory Oats and Spinach Bowl',
      'A quick savory bowl designed for simple prep and steady energy.',
      'A quick savory bowl designed for simple prep and steady energy.',
      15,
      'easy',
      'Uses pantry-friendly ingredients and fiber-rich oats while avoiding garlic and onion for easier filtering.',
      true,
      true,
      'published',
      '1 cup oats' || E'\n' || '2 cups spinach',
      'Cook the oats, season lightly, and stir in spinach before serving.'
    )
) as seeded(
  slug,
  name,
  title,
  summary,
  description,
  prep_time_minutes,
  difficulty,
  why_this_helps,
  is_public,
  is_published,
  status,
  ingredients_raw,
  instructions_raw
)
cross join (
  select id
  from auth.users
  order by created_at asc
  limit 1
) as seed_author
where not exists (
  select 1
  from public.recipes r
  where r.slug = seeded.slug
);

with recipe_lookup as (
  select id, slug from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
),
ingredient_lookup as (
  select id, slug from public.ingredients
  where slug in ('garlic', 'onion', 'salmon', 'oats', 'spinach')
)
update public.recipe_ingredients ri
set ingredient_id = ingredient_lookup.id
from ingredient_lookup
where ri.ingredient_id is null
  and trim(both from lower(ri.ingredient_name)) = ingredient_lookup.slug;

delete from public.recipe_ingredients
where recipe_id in (
  select id from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
);

with recipe_lookup as (
  select id, slug from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
),
ingredient_lookup as (
  select id, slug, name from public.ingredients
  where slug in ('salmon', 'oats', 'spinach')
)
insert into public.recipe_ingredients (
  recipe_id,
  line_no,
  sort_order,
  raw_line,
  raw_text,
  quantity,
  quantity_text,
  unit,
  item_name,
  ingredient_name,
  ingredient_id,
  optional_flag
)
select
  rl.id,
  x.sort_order,
  x.sort_order,
  x.raw_text,
  x.raw_text,
  null,
  x.quantity_text,
  x.unit,
  x.ingredient_name,
  x.ingredient_name,
  il.id,
  false
from recipe_lookup rl
join (
  values
    ('ginger-oat-bowl', 1, '1 cup oats', '1', 'cup', 'oats', 'oats'),
    ('ginger-oat-bowl', 2, '1 cup spinach', '1', 'cup', 'spinach', 'spinach'),
    ('salmon-spinach-plate', 1, '1 salmon fillet', '1', 'fillet', 'salmon', 'salmon'),
    ('salmon-spinach-plate', 2, '2 cups spinach', '2', 'cups', 'spinach', 'spinach'),
    ('savory-oats-spinach-bowl', 1, '1 cup oats', '1', 'cup', 'oats', 'oats'),
    ('savory-oats-spinach-bowl', 2, '2 cups spinach', '2', 'cups', 'spinach', 'spinach')
) as x(recipe_slug, sort_order, raw_text, quantity_text, unit, ingredient_name, ingredient_slug)
  on x.recipe_slug = rl.slug
join ingredient_lookup il on il.slug = x.ingredient_slug;

delete from public.recipe_steps
where recipe_id in (
  select id from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
);

with recipe_lookup as (
  select id, slug from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
)
insert into public.recipe_steps (recipe_id, step_number, body)
select
  rl.id,
  x.step_number,
  x.body
from recipe_lookup rl
join (
  values
    ('ginger-oat-bowl', 1, 'Simmer the oats until tender.'),
    ('ginger-oat-bowl', 2, 'Stir in the spinach just until wilted and serve warm.'),
    ('salmon-spinach-plate', 1, 'Roast the salmon until cooked through.'),
    ('salmon-spinach-plate', 2, 'Serve with spinach wilted in a warm pan.'),
    ('savory-oats-spinach-bowl', 1, 'Cook the oats with water or broth until soft.'),
    ('savory-oats-spinach-bowl', 2, 'Fold in the spinach and season lightly before serving.')
) as x(recipe_slug, step_number, body)
  on x.recipe_slug = rl.slug;

delete from public.recipe_tag_map
where recipe_id in (
  select id from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
);

with recipe_lookup as (
  select id, slug from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
),
tag_lookup as (
  select id, name from public.recipe_tags
  where name in ('low_fodmap', 'anti_inflammatory')
)
insert into public.recipe_tag_map (recipe_id, tag_id)
select
  rl.id,
  tl.id
from recipe_lookup rl
join (
  values
    ('ginger-oat-bowl', 'low_fodmap'),
    ('savory-oats-spinach-bowl', 'low_fodmap'),
    ('salmon-spinach-plate', 'anti_inflammatory')
) as x(recipe_slug, tag_name)
  on x.recipe_slug = rl.slug
join tag_lookup tl on tl.name = x.tag_name;

delete from public.recipe_conditions
where recipe_id in (
  select id from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
);

with recipe_lookup as (
  select id, slug from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
),
condition_lookup as (
  select id, slug from public.conditions
  where slug in ('ibs', 'anxiety', 'hypertension')
)
insert into public.recipe_conditions (recipe_id, condition_id)
select
  rl.id,
  cl.id
from recipe_lookup rl
join (
  values
    ('ginger-oat-bowl', 'ibs'),
    ('ginger-oat-bowl', 'anxiety'),
    ('salmon-spinach-plate', 'hypertension'),
    ('salmon-spinach-plate', 'anxiety'),
    ('savory-oats-spinach-bowl', 'ibs')
) as x(recipe_slug, condition_slug)
  on x.recipe_slug = rl.slug
join condition_lookup cl on cl.slug = x.condition_slug;

insert into public.ingredient_avoidance (condition_id, ingredient_id)
select
  c.id,
  i.id
from public.conditions c
join public.ingredients i on i.slug in ('garlic', 'onion')
where c.slug = 'ibs'
on conflict (condition_id, ingredient_id) do nothing;

insert into public.nutrients (name)
values ('fiber'), ('omega_3'), ('magnesium')
on conflict (name) do nothing;

delete from public.recipe_nutrients
where recipe_id in (
  select id from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
);

with recipe_lookup as (
  select id, slug from public.recipes
  where slug in ('ginger-oat-bowl', 'salmon-spinach-plate', 'savory-oats-spinach-bowl')
),
nutrient_lookup as (
  select id, name from public.nutrients
  where name in ('fiber', 'omega_3', 'magnesium')
)
insert into public.recipe_nutrients (recipe_id, nutrient_id, amount)
select
  rl.id,
  nl.id,
  x.amount
from recipe_lookup rl
join (
  values
    ('ginger-oat-bowl', 'fiber', 6),
    ('ginger-oat-bowl', 'magnesium', 60),
    ('salmon-spinach-plate', 'omega_3', 1.8),
    ('salmon-spinach-plate', 'magnesium', 70),
    ('savory-oats-spinach-bowl', 'fiber', 7)
) as x(recipe_slug, nutrient_name, amount)
  on x.recipe_slug = rl.slug
join nutrient_lookup nl on nl.name = x.nutrient_name;

update public.recipes r
set
  conditions_supported = coalesce((
    select array_agg(distinct c.slug order by c.slug)
    from public.recipe_conditions rc
    join public.conditions c on c.id = rc.condition_id
    where rc.recipe_id = r.id
  ), '{}'::text[]),
  tags = coalesce((
    select array_agg(distinct rt.slug order by rt.slug)
    from public.recipe_tag_map rtm
    join public.recipe_tags rt on rt.id = rtm.tag_id
    where rtm.recipe_id = r.id
  ), '{}'::text[]),
  avoids = coalesce((
    select array_agg(distinct i.slug order by i.slug)
    from public.recipe_conditions rc
    join public.ingredient_avoidance ia on ia.condition_id = rc.condition_id
    join public.ingredients i on i.id = ia.ingredient_id
    where rc.recipe_id = r.id
  ), '{}'::text[]),
  ingredient_ids = coalesce((
    select array_agg(distinct ri.ingredient_id order by ri.ingredient_id)
    from public.recipe_ingredients ri
    where ri.recipe_id = r.id
      and ri.ingredient_id is not null
  ), '{}'::uuid[]);
