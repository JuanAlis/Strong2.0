-- Migration 1: Add notes column to routine_exercises + missing indexes

-- Notes field on exercises (optional tech note per exercise in a routine)
alter table routine_exercises
  add column if not exists notes text;

-- Indexes for workouts queries (history page)
create index if not exists idx_workouts_started on workouts(started_at desc);
create index if not exists idx_workouts_finished on workouts(finished_at)
  where finished_at is not null;

-- Index for done-set counts used in history list
create index if not exists idx_workout_sets_done on workout_sets(workout_id, done)
  where done = true;
