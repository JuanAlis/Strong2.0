-- Migration 2: Auth-scoped body tracking tables

-- Body weight log
create table if not exists body_weight (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  weight_kg   numeric(5,2) not null,
  created_at  timestamptz default now()
);

create index if not exists idx_body_weight_user on body_weight(user_id, date desc);

alter table body_weight enable row level security;

create policy "Users see own weight"
  on body_weight for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Circumference measurements
create table if not exists body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  chest       numeric(5,1),
  arm_right   numeric(5,1),
  arm_left    numeric(5,1),
  waist       numeric(5,1),
  hips        numeric(5,1),
  thigh_right numeric(5,1),
  thigh_left  numeric(5,1),
  created_at  timestamptz default now()
);

create index if not exists idx_body_meas_user on body_measurements(user_id, date desc);

alter table body_measurements enable row level security;

create policy "Users see own measurements"
  on body_measurements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
