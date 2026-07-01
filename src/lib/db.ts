import { supabase } from "./supabase";
import { getExercise } from "@/data/exercises";

// ---------- TYPES ----------
export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export interface RoutineSet {
  id?: string;
  position: number;
  weight: number | null;
  reps: number | null;
  rest_seconds: number;
  set_type?: SetType;
}
export interface RoutineExercise {
  id?: string;
  exercise_id: string;
  position: number;
  notes?: string | null;
  superset_group?: number | null;
  sets: RoutineSet[];
}
export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  created_at?: string;
}

// ---------- LIVE WORKOUT TYPES ----------
export interface LiveSet {
  position: number;
  weight: number | null;
  reps: number | null;
  rest_seconds: number;
  set_type: SetType;
  done: boolean;
}

export interface LiveExercise {
  exercise_id: string;
  position: number;
  notes: string | null;
  superset_group: number | null;
  sets: LiveSet[];
}

export interface LiveWorkout {
  routine_id: string;
  routine_name: string;
  started_at: number;
  exercises: LiveExercise[];
}

export interface GroupCount {
  group: string; // grupo muscular (Pecho, Espalda, …)
  count: number; // series hechas de ese grupo
}

export interface WorkoutSummary {
  id: string;
  routine_name: string | null;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  completed_sets: number;
  groupCounts: GroupCount[]; // desglose de series hechas por grupo muscular
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
  set_type?: SetType;
  notes?: string | null;
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
  sound_enabled?: boolean | null;
  vibration_enabled?: boolean | null;
}

// ---------- HELPERS ----------
async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ---------- ROUTINES ----------
const ROUTINE_SELECT =
  "id, name, created_at, routine_exercises(id, exercise_id, position, notes, superset_group, routine_sets(id, position, weight, reps, rest_seconds, set_type))";

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
        superset_group: e.superset_group ?? null,
        sets: (e.routine_sets || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((s: any) => ({
            id: s.id,
            position: s.position,
            weight: s.weight,
            reps: s.reps,
            rest_seconds: s.rest_seconds,
            set_type: (s.set_type as SetType) ?? 'normal',
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
        superset_group: ex.superset_group ?? null,
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
        set_type: s.set_type ?? 'normal',
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

// ---------- WEEKLY SCHEDULE ----------
// Plan semanal: día (0=Lunes … 6=Domingo) → lista ordenada de routine_id.
// Una rutina puede aparecer en varios días.
export async function getSchedule(): Promise<Record<number, string[]>> {
  const { data, error } = await supabase
    .from("routine_schedule")
    .select("routine_id, day_of_week, position")
    .order("day_of_week", { ascending: true })
    .order("position", { ascending: true });
  if (error) throw error;
  const plan: Record<number, string[]> = {};
  (data || []).forEach((r: { routine_id: string; day_of_week: number }) => {
    (plan[r.day_of_week] ||= []).push(r.routine_id);
  });
  return plan;
}

// Reemplaza el plan completo del usuario (borra + inserta). Simple y atómico
// para un plan de pocas decenas de filas.
export async function saveSchedule(
  entries: { routine_id: string; day_of_week: number; position: number }[]
): Promise<void> {
  const userId = await currentUserId();
  const { error: delErr } = await supabase
    .from("routine_schedule")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw delErr;
  if (entries.length === 0) return;
  const rows = entries.map((e) => ({ ...e, user_id: userId }));
  const { error } = await supabase.from("routine_schedule").insert(rows);
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
  setType?: SetType;
  notes?: string | null;
}) {
  const { error } = await supabase.from("workout_sets").insert({
    workout_id: payload.workoutId,
    exercise_id: payload.exerciseId,
    position: payload.position,
    set_position: payload.setPosition,
    weight: payload.weight,
    reps: payload.reps,
    done: payload.done,
    set_type: payload.setType ?? 'normal',
    notes: payload.notes ?? null,
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
    supabase.from("workout_sets").select("workout_id, exercise_id").eq("done", true),
  ]);

  if (workoutsRes.error) throw workoutsRes.error;

  const countMap: Record<string, number> = {};
  const groupMap: Record<string, Record<string, number>> = {};
  (setsRes.data || []).forEach((r: { workout_id: string; exercise_id: string }) => {
    countMap[r.workout_id] = (countMap[r.workout_id] ?? 0) + 1;
    const g = getExercise(r.exercise_id)?.group ?? "Otro";
    (groupMap[r.workout_id] ||= {})[g] = (groupMap[r.workout_id][g] ?? 0) + 1;
  });

  return (workoutsRes.data || []).map((w: any) => ({
    id: w.id,
    routine_name: w.routine_name,
    started_at: w.started_at,
    finished_at: w.finished_at,
    duration_seconds: w.duration_seconds,
    completed_sets: countMap[w.id] ?? 0,
    groupCounts: Object.entries(groupMap[w.id] ?? {})
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count),
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
      .select("id, exercise_id, position, set_position, weight, reps, done, set_type, notes")
      .eq("workout_id", workoutId)
      .order("position")
      .order("set_position"),
  ]);

  if (workoutRes.error) return null;
  const w = workoutRes.data;
  const doneSets = (setsRes.data || []).filter((s: any) => s.done);
  const completedSets = doneSets.length;

  const groupMap: Record<string, number> = {};
  doneSets.forEach((s: any) => {
    const g = getExercise(s.exercise_id)?.group ?? "Otro";
    groupMap[g] = (groupMap[g] ?? 0) + 1;
  });
  const groupCounts = Object.entries(groupMap)
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count);

  return {
    id: w.id,
    routine_name: w.routine_name,
    started_at: w.started_at,
    finished_at: w.finished_at,
    duration_seconds: w.duration_seconds,
    completed_sets: completedSets,
    groupCounts,
    sets: (setsRes.data || []).map((s: any) => ({
      id: s.id,
      exercise_id: s.exercise_id,
      position: s.position,
      set_position: s.set_position,
      weight: s.weight,
      reps: s.reps,
      done: s.done,
      set_type: (s.set_type as SetType) ?? 'normal',
      notes: s.notes ?? null,
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

// ---------- PROGRESS ----------
export interface ProgressPoint {
  date: string;        // finished_at ISO of the workout
  maxWeight: number;   // heaviest set that day
  maxReps: number;     // most reps in a single set
  volume: number;      // Σ (peso × reps) de las series hechas
  bestReps: number;    // reps de la serie más pesada
}

// Serie temporal de progresión por exercise_id, agregada por entrenamiento terminado.
export async function getProgress(): Promise<Record<string, ProgressPoint[]>> {
  const [workoutsRes, setsRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, finished_at")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: true }),
    supabase
      .from("workout_sets")
      .select("workout_id, exercise_id, weight, reps, done")
      .eq("done", true),
  ]);
  if (workoutsRes.error) throw workoutsRes.error;
  if (setsRes.error) throw setsRes.error;

  const workoutDate: Record<string, string> = {};
  (workoutsRes.data || []).forEach((w: any) => {
    workoutDate[w.id] = w.finished_at;
  });

  type Agg = { maxWeight: number; maxReps: number; volume: number; bestReps: number };
  const byExercise: Record<string, Record<string, Agg>> = {};

  (setsRes.data || []).forEach((s: any) => {
    if (!workoutDate[s.workout_id]) return; // solo entrenamientos terminados
    const w = s.weight ?? 0;
    const r = s.reps ?? 0;
    const ex = (byExercise[s.exercise_id] ||= {});
    const agg = (ex[s.workout_id] ||= { maxWeight: 0, maxReps: 0, volume: 0, bestReps: 0 });
    agg.volume += w * r;
    if (r > agg.maxReps) agg.maxReps = r;
    if (w > agg.maxWeight) {
      agg.maxWeight = w;
      agg.bestReps = r;
    }
  });

  const result: Record<string, ProgressPoint[]> = {};
  Object.entries(byExercise).forEach(([exId, workouts]) => {
    result[exId] = Object.entries(workouts)
      .map(([wid, agg]) => ({ date: workoutDate[wid], ...agg }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });
  return result;
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
    .select("sex, height_cm, birth_date, goal, sound_enabled, vibration_enabled")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return {
    sex: (data.sex as SexType) ?? null,
    height_cm: data.height_cm ?? null,
    birth_date: data.birth_date ?? null,
    goal: (data.goal as GoalType) ?? null,
    sound_enabled: data.sound_enabled ?? true,
    vibration_enabled: data.vibration_enabled ?? true,
  };
}

export async function upsertUserProfile(userId: string, profile: UserProfile): Promise<void> {
  const { error } = await supabase.from("user_profile").upsert({
    user_id: userId,
    sex: profile.sex,
    height_cm: profile.height_cm,
    birth_date: profile.birth_date,
    goal: profile.goal,
    sound_enabled: profile.sound_enabled ?? true,
    vibration_enabled: profile.vibration_enabled ?? true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}


// ---------- DELETE WEIGH DATA ----------
export async function deleteBodyWeight(id: string) {
  const { error } = await supabase.from("body_weight").delete().eq("id", id);
  if (error) throw error;
}


// ---------- DELETE MEDIDAS DATA ----------
export async function deleteBodyMeasurement(id: string) {
  const { error } = await supabase.from("body_measurements").delete().eq("id", id);
  if (error) throw error;
}

