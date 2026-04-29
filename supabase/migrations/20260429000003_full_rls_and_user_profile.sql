-- Migration 3: Full RLS + user_id on parent tables + user_profile
-- Run after migrations 1 and 2.

-- ============================================================
-- A) Add user_id to routines and workouts
-- ============================================================

alter table routines
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table workouts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Index for fast per-user lookups
create index if not exists idx_routines_user on routines(user_id);
create index if not exists idx_workouts_user on workouts(user_id);

-- ============================================================
-- NOTE: If you have existing rows, claim them by running:
--   UPDATE routines SET user_id = '<your-uuid>';
--   UPDATE workouts SET user_id = '<your-uuid>';
-- Find your UUID in: Supabase Dashboard → Authentication → Users
-- ============================================================

-- ============================================================
-- B) Enable RLS on all workout/routine tables
-- ============================================================

-- routines: direct user_id check
alter table routines enable row level security;

create policy "own_routines" on routines
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- routine_exercises: inherit via parent routine
alter table routine_exercises enable row level security;

create policy "own_routine_exercises" on routine_exercises
  for all
  using (
    exists (
      select 1 from routines
      where id = routine_exercises.routine_id
        and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from routines
      where id = routine_exercises.routine_id
        and user_id = auth.uid()
    )
  );

-- routine_sets: inherit via routine_exercise → routine
alter table routine_sets enable row level security;

create policy "own_routine_sets" on routine_sets
  for all
  using (
    exists (
      select 1 from routine_exercises re
      join routines r on r.id = re.routine_id
      where re.id = routine_sets.routine_exercise_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from routine_exercises re
      join routines r on r.id = re.routine_id
      where re.id = routine_sets.routine_exercise_id
        and r.user_id = auth.uid()
    )
  );

-- workouts: direct user_id check
alter table workouts enable row level security;

create policy "own_workouts" on workouts
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- workout_sets: inherit via parent workout
alter table workout_sets enable row level security;

create policy "own_workout_sets" on workout_sets
  for all
  using (
    exists (
      select 1 from workouts
      where id = workout_sets.workout_id
        and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts
      where id = workout_sets.workout_id
        and user_id = auth.uid()
    )
  );

-- ============================================================
-- C) user_profile table
-- ============================================================

create table if not exists user_profile (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  sex        text check (sex in ('M', 'F')),
  height_cm  numeric(5,1),
  birth_date date,
  goal       text check (goal in ('cut', 'maintain', 'bulk')),
  updated_at timestamptz default now()
);

alter table user_profile enable row level security;

create policy "own_profile" on user_profile
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
