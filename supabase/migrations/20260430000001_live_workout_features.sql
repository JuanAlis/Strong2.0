-- set tags on template and history
alter table routine_sets add column if not exists set_type text
  check (set_type in ('normal','warmup','dropset','failure')) default 'normal';

alter table workout_sets add column if not exists set_type text
  check (set_type in ('normal','warmup','dropset','failure')) default 'normal';

-- supersets
alter table routine_exercises add column if not exists superset_group int;

-- audio / haptic preferences
alter table user_profile add column if not exists sound_enabled boolean default true;
alter table user_profile add column if not exists vibration_enabled boolean default true;
