-- 1. Recipes
create table public.recipes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  description text,
  prep_time text,
  cook_time text,
  servings numeric,
  difficulty text,
  calories text,
  image_path text,
  is_saved boolean default false,
  rating numeric,
  author text,
  ingredients_json text,
  instructions_json text,
  tags_json text,
  nutrition_json text,
  audio_path text,
  duration numeric,
  url text,
  images_json text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.recipes enable row level security;
create policy "Users can crud own recipes" on public.recipes using (auth.uid() = user_id);

-- 2. Collections
create table public.collections (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  description text,
  color text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.collections enable row level security;
create policy "Users can crud own collections" on public.collections using (auth.uid() = user_id);

-- 3. Collection Recipes (Join Table)
create table public.collection_recipes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  collection_id text references public.collections(id) on delete cascade,
  recipe_id text references public.recipes(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.collection_recipes enable row level security;
create policy "Users can crud own collection_recipes" on public.collection_recipes using (auth.uid() = user_id);

-- 4. Meal Plans
create table public.meal_plans (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  date text not null,
  type text not null,
  recipe_id text not null,
  is_cooked boolean default false,
  notification_id text,
  reminder_minutes_before numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.meal_plans enable row level security;
create policy "Users can crud own meal_plans" on public.meal_plans using (auth.uid() = user_id);
