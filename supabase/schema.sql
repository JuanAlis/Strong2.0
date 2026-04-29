-- ============================================================
-- GYM APP — SUPABASE SCHEMA
-- Pega esto entero en el SQL Editor de Supabase y ejecuta.
-- ============================================================

-- 1) Rutinas (templates que tú creas)
create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Ejercicios dentro de una rutina (con orden)
create table if not exists routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references routines(id) on delete cascade,
  exercise_id text not null,           -- id del catálogo en /lib/exercises.ts
  position int not null default 0,     -- orden en la rutina
  created_at timestamptz default now()
);

-- 3) Series planificadas para cada ejercicio en la rutina
create table if not exists routine_sets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid references routine_exercises(id) on delete cascade,
  position int not null default 0,
  weight numeric,
  reps int,
  rest_seconds int default 90,
  created_at timestamptz default now()
);

-- 4) Sesiones de entrenamiento (cada vez que entrenas una rutina)
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references routines(id) on delete set null,
  routine_name text,                   -- snapshot por si borras la rutina
  started_at timestamptz default now(),
  finished_at timestamptz,
  duration_seconds int
);

-- 5) Series realizadas durante el workout (lo que de verdad hiciste)
create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade,
  exercise_id text not null,
  position int not null default 0,
  set_position int not null default 0,
  weight numeric,
  reps int,
  done boolean default false,
  created_at timestamptz default now()
);

-- ÍNDICES útiles
create index if not exists idx_routine_exercises_routine on routine_exercises(routine_id);
create index if not exists idx_routine_sets_re on routine_sets(routine_exercise_id);
create index if not exists idx_workout_sets_workout on workout_sets(workout_id);
create index if not exists idx_workout_sets_exercise on workout_sets(exercise_id);

-- ============================================================
-- VISTA: último peso por ejercicio (para mostrar "Anterior")
-- ============================================================
create or replace view exercise_last_performance as
select distinct on (ws.exercise_id)
  ws.exercise_id,
  ws.weight as last_weight,
  ws.reps as last_reps,
  w.finished_at as last_done_at
from workout_sets ws
join workouts w on w.id = ws.workout_id
where ws.done = true
  and w.finished_at is not null
  and ws.weight is not null
order by ws.exercise_id, w.finished_at desc;

-- ============================================================
-- ROW LEVEL SECURITY
-- Como es una app personal sin auth, deshabilitamos RLS.
-- Si algún día añades auth, activa RLS y crea policies por user_id.
-- ============================================================
alter table routines disable row level security;
alter table routine_exercises disable row level security;
alter table routine_sets disable row level security;
alter table workouts disable row level security;
alter table workout_sets disable row level security;
