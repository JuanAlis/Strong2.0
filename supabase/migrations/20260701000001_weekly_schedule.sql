-- Migration 5: Plan semanal (weekly schedule)
-- Asigna rutinas a días de la semana. Una rutina puede repetirse en varios días.
-- Convención day_of_week: 0 = Lunes, 1 = Martes ... 6 = Domingo.

create table if not exists routine_schedule (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  routine_id   uuid not null references routines(id) on delete cascade,
  day_of_week  int  not null check (day_of_week between 0 and 6),
  position     int  not null default 0,
  created_at   timestamptz default now()
);

create index if not exists idx_routine_schedule_user on routine_schedule(user_id);
create index if not exists idx_routine_schedule_day  on routine_schedule(user_id, day_of_week, position);

-- RLS: cada usuario solo ve/edita su propio plan
alter table routine_schedule enable row level security;

create policy "own_routine_schedule" on routine_schedule
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
