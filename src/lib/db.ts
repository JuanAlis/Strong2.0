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
  notes?: string | null;
  sets: RoutineSet[];
}
export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  created_at?: string;
}

export interface WorkoutSummary {
  id: string;
  routine_name: string | null;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  completed_sets: number;
}

export interface WorkoutDetail extends WorkoutSummary {
  sets: WorkoutSetRow[];
}

export interface WorkoutSetRow {
  id: string;
  exercise_id: string;
  position: number;
  set_position: number;
  weight: number | null;
  reps: number | null;
  done: boolean;
}

export interface BodyWeightEntry {
  id: string;
  date: string;
  weight_kg: number;
}

export interface BodyMeasurementEntry {
  id: string;
  date: string;
  chest: number | null;
  arm_right: number | null;
  arm_left: number | null;
  waist: number | null;
  hips: number | null;
  thigh_right: number | null;
  thigh_left: number | null;
}

export type GoalType = "cut" | "maintain" | "bulk";
export type SexType = "M" | "F";

export interface UserProfile {
  sex: SexType | null;
  height_cm: number | null;
  birth_date: string | null;
  goal: GoalType | null;
}

// ---------- HELPERS ----------
async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ---------- ROUTINES ----------
const ROUTINE_SELECT =
  "id, name, created_at, routine_exercises(id, exercise_id, position, notes, routine_sets(id, position, weight, reps, rest_seconds))";

function mapRoutine(r: any): Routine {
  return {
    id: r.id,
    name: r.name,
    created_at: r.created_at,
    exercises: (r.routine_exercises || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((e: any) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        position: e.position,
        notes: e.notes ?? null,
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

export async function listRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("routines")
    .select(ROUTINE_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRoutine);
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const { data, error } = await supabase
    .from("routines")
    .select(ROUTINE_SELECT)
    .eq("id", id)
    .single();
  if (error) return null;
  return mapRoutine(data);
}

export async function saveRoutine(routine: {
  id?: string;
  name: string;
  exercises: RoutineExercise[];
}): Promise<string> {
  const userId = await currentUserId();
  let routineId = routine.id;

  if (!routineId) {
    const { data, error } = await supabase
      .from("routines")
      .insert({ name: routine.name, user_id: userId })
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
    await supabase.from("routine_exercises").delete().eq("routine_id", routineId);
  }

  for (let i = 0; i < routine.exercises.length; i++) {
    const ex = routine.exercises[i];
    const { data: exRow, error: exErr } = await supabase
      .from("routine_exercises")
      .insert({
        routine_id: routineId,
        exercise_id: ex.exercise_id,
        position: i,
        notes: ex.notes || null,
      })
      .select("id")
      .single();
    if (exErr) throw exErr;

    if (ex.sets.length > 0) {
      const setsToInsert = ex.sets.map((s, j) => ({
        routine_exercise_id: exRow.id,
        position: j,
        weight:
          s.weight === null || s.weight === undefined || (s.weight as unknown as string) === ""
            ? null
            : Number(s.weight),
        reps:
          s.reps === null || s.reps === undefined || (s.reps as unknown as string) === ""
            ? null
            : Number(s.reps),
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
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      routine_id: routineId,
      routine_name: routineName,
      started_at: new Date().toISOString(),
      user_id: userId,
    })
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

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- HISTORY ----------
export async function listWorkouts(): Promise<WorkoutSummary[]> {
  const [workoutsRes, setsRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, routine_name, started_at, finished_at, duration_seconds")
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false }),
    supabase.from("workout_sets").select("workout_id").eq("done", true),
  ]);

  if (workoutsRes.error) throw workoutsRes.error;

  const countMap: Record<string, number> = {};
  (setsRes.data || []).forEach((r: { workout_id: string }) => {
    countMap[r.workout_id] = (countMap[r.workout_id] ?? 0) + 1;
  });

  return (workoutsRes.data || []).map((w: any) => ({
    id: w.id,
    routine_name: w.routine_name,
    started_at: w.started_at,
    finished_at: w.finished_at,
    duration_seconds: w.duration_seconds,
    completed_sets: countMap[w.id] ?? 0,
  }));
}

export async function getWorkoutDetail(workoutId: string): Promise<WorkoutDetail | null> {
  const [workoutRes, setsRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, routine_name, started_at, finished_at, duration_seconds")
      .eq("id", workoutId)
      .single(),
    supabase
      .from("workout_sets")
      .select("id, exercise_id, position, set_position, weight, reps, done")
      .eq("workout_id", workoutId)
      .order("position")
      .order("set_position"),
  ]);

  if (workoutRes.error) return null;
  const w = workoutRes.data;
  const completedSets = (setsRes.data || []).filter((s: any) => s.done).length;

  return {
    id: w.id,
    routine_name: w.routine_name,
    started_at: w.started_at,
    finished_at: w.finished_at,
    duration_seconds: w.duration_seconds,
    completed_sets: completedSets,
    sets: (setsRes.data || []).map((s: any) => ({
      id: s.id,
      exercise_id: s.exercise_id,
      position: s.position,
      set_position: s.set_position,
      weight: s.weight,
      reps: s.reps,
      done: s.done,
    })),
  };
}

// ---------- LAST PERFORMANCE ----------
export async function getLastPerformance(): Promise<Record<string, { weight: number; reps: number }>> {
  const { data, error } = await supabase
    .from("exercise_last_performance")
    .select("exercise_id, last_weight, last_reps");
  if (error) {
    console.warn("History view query failed:", error.message);
    return {};
  }
  const map: Record<string, { weight: number; reps: number }> = {};
  (data || []).forEach((row: any) => {
    map[row.exercise_id] = { weight: row.last_weight, reps: row.last_reps };
  });
  return map;
}

// ---------- BODY WEIGHT ----------
export async function listBodyWeight(userId: string): Promise<BodyWeightEntry[]> {
  const { data, error } = await supabase
    .from("body_weight")
    .select("id, date, weight_kg")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addBodyWeight(userId: string, date: string, weight_kg: number): Promise<void> {
  const { error } = await supabase.from("body_weight").insert({ user_id: userId, date, weight_kg });
  if (error) throw error;
}

// ---------- BODY MEASUREMENTS ----------
export async function listBodyMeasurements(userId: string): Promise<BodyMeasurementEntry[]> {
  const { data, error } = await supabase
    .from("body_measurements")
    .select("id, date, chest, arm_right, arm_left, waist, hips, thigh_right, thigh_left")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addBodyMeasurement(
  userId: string,
  entry: Omit<BodyMeasurementEntry, "id">
): Promise<void> {
  const { error } = await supabase.from("body_measurements").insert({ user_id: userId, ...entry });
  if (error) throw error;
}

// ---------- USER PROFILE ----------
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profile")
    .select("sex, height_cm, birth_date, goal")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return {
    sex: (data.sex as SexType) ?? null,
    height_cm: data.height_cm ?? null,
    birth_date: data.birth_date ?? null,
    goal: (data.goal as GoalType) ?? null,
  };
}

export async function upsertUserProfile(userId: string, profile: UserProfile): Promise<void> {
  const { error } = await supabase.from("user_profile").upsert({
    user_id: userId,
    sex: profile.sex,
    height_cm: profile.height_cm,
    birth_date: profile.birth_date,
    goal: profile.goal,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
