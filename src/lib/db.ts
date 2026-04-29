import { supabase } from "./supabase";

// ---------- TYPES ----------
export interface RoutineSet {
  id?: string;
  position: number;
  weight: number | null;
  reps: number | null;
  rest_seconds: number;
}
export interface RoutineExercise {
  id?: string;
  exercise_id: string;
  position: number;
  sets: RoutineSet[];
}
export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  created_at?: string;
}

// ---------- ROUTINES ----------
export async function listRoutines(): Promise<Routine[]> {
  const { data: routines, error } = await supabase
    .from("routines")
    .select("id, name, created_at, routine_exercises(id, exercise_id, position, routine_sets(id, position, weight, reps, rest_seconds))")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (routines || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    created_at: r.created_at,
    exercises: (r.routine_exercises || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((e: any) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        position: e.position,
        sets: (e.routine_sets || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((s: any) => ({
            id: s.id,
            position: s.position,
            weight: s.weight,
            reps: s.reps,
            rest_seconds: s.rest_seconds,
          })),
      })),
  }));
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const { data, error } = await supabase
    .from("routines")
    .select("id, name, created_at, routine_exercises(id, exercise_id, position, routine_sets(id, position, weight, reps, rest_seconds))")
    .eq("id", id)
    .single();
  if (error) return null;
  return {
    id: data.id,
    name: data.name,
    created_at: data.created_at,
    exercises: (data.routine_exercises || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((e: any) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        position: e.position,
        sets: (e.routine_sets || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((s: any) => ({
            id: s.id,
            position: s.position,
            weight: s.weight,
            reps: s.reps,
            rest_seconds: s.rest_seconds,
          })),
      })),
  };
}

export async function saveRoutine(routine: { id?: string; name: string; exercises: RoutineExercise[] }): Promise<string> {
  let routineId = routine.id;
  if (!routineId) {
    const { data, error } = await supabase
      .from("routines")
      .insert({ name: routine.name })
      .select("id")
      .single();
    if (error) throw error;
    routineId = data.id;
  } else {
    const { error } = await supabase
      .from("routines")
      .update({ name: routine.name, updated_at: new Date().toISOString() })
      .eq("id", routineId);
    if (error) throw error;
    // Delete existing exercises & sets (cascades)
    await supabase.from("routine_exercises").delete().eq("routine_id", routineId);
  }

  // Insert exercises
  for (let i = 0; i < routine.exercises.length; i++) {
    const ex = routine.exercises[i];
    const { data: exRow, error: exErr } = await supabase
      .from("routine_exercises")
      .insert({ routine_id: routineId, exercise_id: ex.exercise_id, position: i })
      .select("id")
      .single();
    if (exErr) throw exErr;
    const exRowId = exRow.id;

    if (ex.sets.length > 0) {
      const setsToInsert = ex.sets.map((s, j) => ({
        routine_exercise_id: exRowId,
        position: j,
        weight: s.weight === null || s.weight === undefined || (s.weight as any) === "" ? null : Number(s.weight),
        reps: s.reps === null || s.reps === undefined || (s.reps as any) === "" ? null : Number(s.reps),
        rest_seconds: Number(s.rest_seconds) || 90,
      }));
      const { error: setErr } = await supabase.from("routine_sets").insert(setsToInsert);
      if (setErr) throw setErr;
    }
  }

  return routineId!;
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) throw error;
}

// ---------- WORKOUTS ----------
export async function startWorkout(routineId: string, routineName: string): Promise<string> {
  const { data, error } = await supabase
    .from("workouts")
    .insert({ routine_id: routineId, routine_name: routineName, started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function finishWorkout(workoutId: string, durationSeconds: number) {
  const { error } = await supabase
    .from("workouts")
    .update({ finished_at: new Date().toISOString(), duration_seconds: durationSeconds })
    .eq("id", workoutId);
  if (error) throw error;
}

export async function saveWorkoutSet(payload: {
  workoutId: string;
  exerciseId: string;
  position: number;
  setPosition: number;
  weight: number | null;
  reps: number | null;
  done: boolean;
}) {
  const { error } = await supabase.from("workout_sets").insert({
    workout_id: payload.workoutId,
    exercise_id: payload.exerciseId,
    position: payload.position,
    set_position: payload.setPosition,
    weight: payload.weight,
    reps: payload.reps,
    done: payload.done,
  });
  if (error) throw error;
}

// ---------- HISTORY (last performance per exercise) ----------
export async function getLastPerformance(): Promise<Record<string, { weight: number; reps: number }>> {
  const { data, error } = await supabase
    .from("exercise_last_performance")
    .select("exercise_id, last_weight, last_reps");
  if (error) {
    console.warn("History view query failed (probably empty):", error.message);
    return {};
  }
  const map: Record<string, { weight: number; reps: number }> = {};
  (data || []).forEach((row: any) => {
    map[row.exercise_id] = { weight: row.last_weight, reps: row.last_reps };
  });
  return map;
}
