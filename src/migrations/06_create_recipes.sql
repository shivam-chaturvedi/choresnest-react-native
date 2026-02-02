-- Recipes
create table recipes (
  id text primary key,
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

-- Collections (Recipe Collections)
create table collections (
  id text primary key,
  name text not null,
  description text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false
);

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

create index idx_meal_plans_date on meal_plans(date);
create index idx_meal_plans_recipe_id on meal_plans(recipe_id);

-- Enable RLS
alter table recipes enable row level security;
alter table collections enable row level security;
alter table collection_recipes enable row level security;
alter table meal_plans enable row level security;

-- Policies
create policy "Enable all access for authenticated users" on recipes for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on collections for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on collection_recipes for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on meal_plans for all using (auth.role() = 'authenticated');
