-- ============================================================
-- PLANIFICADOR — ejecuta en Supabase SQL Editor
-- ============================================================

-- Bloques predefinidos (biblioteca de bloques reutilizables)
create table if not exists schedule_presets (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  category   text not null default 'other',
  duration   numeric(4,2) not null default 1,
  created_at timestamptz default now()
);

-- Bloques colocados en el calendario
create table if not exists schedule_blocks (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  label       text not null,
  category    text not null default 'other',
  start_hour  numeric(4,2) not null,  -- 0..23.75
  duration    numeric(4,2) not null default 1,
  locked_days jsonb,  -- null | 'daily' | 'weekly' | [0,1,2,...] (0=Mon)
  created_at  timestamptz default now()
);

-- Plantillas de semana
create table if not exists schedule_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  blocks     jsonb,   -- array of block objects with day_offset
  created_at timestamptz default now()
);

-- Desactivar RLS
alter table schedule_presets  disable row level security;
alter table schedule_blocks   disable row level security;
alter table schedule_templates disable row level security;
