-- Migration 6: Nota técnica por ejercicio en el historial de entrenamientos.
-- Permite guardar la nota aunque no se actualice la plantilla de la rutina.
-- La nota es por ejercicio; se guarda (denormalizada) en cada serie del ejercicio.

alter table workout_sets add column if not exists notes text;
