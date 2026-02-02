-- Recipes
create table recipes (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
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
  ingredients_json text, -- JSON array
  instructions_json text, -- JSON array
  tags_json text, -- JSON array
  nutrition_json text, -- JSON object
  audio_path text,
  duration numeric,
  url text,
  images_json text, -- JSON array of additional images
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_recipes_profile_id on recipes(profile_id);

-- Collections (Recipe Collections)
create table collections (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);
create index idx_collections_profile_id on collections(profile_id);

-- Collection Recipes (Many-to-Many link)
create table collection_recipes (
  id text primary key,
  collection_id text references collections(id) on delete cascade,
  recipe_id text references recipes(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false,
  unique(collection_id, recipe_id)
);

create index idx_collection_recipes_collection_id on collection_recipes(collection_id);
create index idx_collection_recipes_recipe_id on collection_recipes(recipe_id);

-- Meal Plans
create table meal_plans (
  id text primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  date text not null, -- YYYY-MM-DD
  type text not null, -- breakfast, lunch, dinner, snack
  recipe_id text references recipes(id) on delete cascade,
  is_cooked boolean default false,
  notification_id text,
  reminder_minutes_before numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

create index idx_meal_plans_profile_id on meal_plans(profile_id);
create index idx_meal_plans_date on meal_plans(date);
create index idx_meal_plans_recipe_id on meal_plans(recipe_id);

-- Enable RLS
alter table recipes enable row level security;
alter table collections enable row level security;
alter table collection_recipes enable row level security;
alter table meal_plans enable row level security;

-- Policies for recipes
create policy "Users can view own recipes"
  on recipes for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own recipes"
  on recipes for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own recipes"
  on recipes for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own recipes"
  on recipes for delete
  using ( auth.uid() = profile_id );

-- Policies for collections
create policy "Users can view own collections"
  on collections for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own collections"
  on collections for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own collections"
  on collections for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own collections"
  on collections for delete
  using ( auth.uid() = profile_id );

-- Policies for collection_recipes (inherit from collection)
create policy "Users can view own collection_recipes"
  on collection_recipes for select
  using ( 
    exists (
      select 1 from collections 
      where collections.id = collection_recipes.collection_id 
      and collections.profile_id = auth.uid()
    )
  );

create policy "Users can insert own collection_recipes"
  on collection_recipes for insert
  with check ( 
    exists (
      select 1 from collections 
      where collections.id = collection_recipes.collection_id 
      and collections.profile_id = auth.uid()
    )
  );

create policy "Users can update own collection_recipes"
  on collection_recipes for update
  using ( 
    exists (
      select 1 from collections 
      where collections.id = collection_recipes.collection_id 
      and collections.profile_id = auth.uid()
    )
  );

create policy "Users can delete own collection_recipes"
  on collection_recipes for delete
  using ( 
    exists (
      select 1 from collections 
      where collections.id = collection_recipes.collection_id 
      and collections.profile_id = auth.uid()
    )
  );

-- Policies for meal_plans
create policy "Users can view own meal_plans"
  on meal_plans for select
  using ( auth.uid() = profile_id );

create policy "Users can insert own meal_plans"
  on meal_plans for insert
  with check ( auth.uid() = profile_id );

create policy "Users can update own meal_plans"
  on meal_plans for update
  using ( auth.uid() = profile_id );

create policy "Users can delete own meal_plans"
  on meal_plans for delete
  using ( auth.uid() = profile_id );

