-- ============================================================
-- NUEVAS TABLAS — ejecuta en Supabase SQL Editor
-- ============================================================

-- Alimentos (base de datos propia, por 100g)
create table if not exists foods (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  brand             text,
  calories_per_100g numeric(7,2) not null,
  protein_per_100g  numeric(6,2) default 0,
  carbs_per_100g    numeric(6,2) default 0,
  fat_per_100g      numeric(6,2) default 0,
  created_at        timestamptz default now()
);

-- Recetas (agrupa alimentos)
create table if not exists recipes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  servings       numeric(5,2) default 1,
  ingredients    jsonb,          -- array de { food_id, quantity }
  calories_total numeric(8,2),
  protein_total  numeric(7,2),
  carbs_total    numeric(7,2),
  fat_total      numeric(7,2),
  created_at     timestamptz default now()
);

-- Planificador semanal de comidas
create table if not exists meal_plan (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  slot        text not null,   -- 'Desayuno', 'Almuerzo / Comida', 'Merienda', 'Cena'
  recipe_id   uuid references recipes(id) on delete set null,
  recipe_name text,
  servings    numeric(5,2) default 1,
  calories    numeric(8,2),
  protein_g   numeric(7,2),
  carbs_g     numeric(7,2),
  fat_g       numeric(7,2),
  created_at  timestamptz default now()
);

-- Añadir columnas a workouts para los nuevos campos
alter table workouts
  add column if not exists split_id     text,
  add column if not exists duration_min numeric(5,1);

-- Desactivar RLS también en las nuevas tablas
alter table foods     disable row level security;
alter table recipes   disable row level security;
alter table meal_plan disable row level security;
