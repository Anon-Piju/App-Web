-- ============================================================
-- ORBIT — Esquema Supabase
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Habilitar extensión UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- TAREAS
-- ============================================================
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'pending'
              check (status in ('pending','progress','done','discarded')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- ENTRENAMIENTOS
-- ============================================================
create table if not exists workouts (
  id                 uuid primary key default gen_random_uuid(),
  date               date not null,
  performance_rating smallint check (performance_rating between 1 and 5),
  notes              text,
  created_at         timestamptz default now()
);

create table if not exists workout_sets (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid references workouts(id) on delete cascade,
  exercise_id text not null,
  sets        smallint,
  reps        smallint,
  weight      numeric(6,2),
  created_at  timestamptz default now()
);

-- ============================================================
-- NUTRICIÓN
-- ============================================================
create table if not exists nutrition_logs (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  meal_type  text,
  food_id    text,
  food_name  text not null,
  quantity_g numeric(7,1),
  calories   numeric(7,1),
  protein_g  numeric(6,1),
  carbs_g    numeric(6,1),
  fat_g      numeric(6,1),
  created_at timestamptz default now()
);

-- ============================================================
-- FINANZAS — Inversiones
-- ============================================================
create table if not exists investments (
  id            uuid primary key default gen_random_uuid(),
  asset         text not null,
  type          text,
  amount        numeric(12,2),
  buy_price     numeric(12,4),
  current_price numeric(12,4),
  date          date,
  notes         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- FINANZAS — Transacciones
-- ============================================================
create table if not exists transactions (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('income','expense')),
  amount     numeric(12,2) not null,
  category   text,
  date       date not null,
  notes      text,
  created_at timestamptz default now()
);

-- ============================================================
-- HÁBITOS
-- ============================================================
create table if not exists habits (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  icon         text default '📚',
  target_value numeric(8,2),
  target_unit  text,
  goal_notes   text,
  created_at   timestamptz default now()
);

create table if not exists habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid references habits(id) on delete cascade,
  date       date not null,
  value      numeric(8,2) default 1,
  notes      text,
  created_at timestamptz default now(),
  unique (habit_id, date)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Por ahora desactivado para uso local simple.
-- Actívalo cuando añadas autenticación de usuario.
-- ============================================================
-- alter table tasks          enable row level security;
-- alter table workouts       enable row level security;
-- alter table workout_sets   enable row level security;
-- alter table nutrition_logs enable row level security;
-- alter table investments    enable row level security;
-- alter table transactions   enable row level security;
-- alter table habits         enable row level security;
-- alter table habit_logs     enable row level security;
