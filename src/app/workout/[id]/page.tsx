"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import RoutineEditor from "@/components/RoutineEditor";
import {
  getRoutine,
  startWorkout,
  finishWorkout,
  saveWorkoutSet,
  saveRoutine,
  getLastPerformance,
  getUserProfile,
  type Routine,
  type LiveExercise,
  type LiveWorkout,
  type RoutineExercise,
} from "@/lib/db";
import { supabase } from "@/lib/supabase";

// ---- Audio / haptic ----
function playBell(sound: boolean, vibrate: boolean) {
  if (sound) {
    try { new Audio("/bell.mp3").play(); } catch {}
  }
  if (vibrate) {
    try { navigator.vibrate([200, 100, 200]); } catch {}
  }
}

// ---- Helpers ----
function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function liveToRoutineExercises(exs: LiveExercise[]): RoutineExercise[] {
  return exs.map((ex, i) => ({
    exercise_id: ex.exercise_id,
    position: i,
    notes: ex.notes,
    superset_group: ex.superset_group,
    sets: ex.sets.map((s, j) => ({
      position: j,
      weight: s.weight,
      reps: s.reps,
      rest_seconds: s.rest_seconds,
      set_type: s.set_type,
    })),
  }));
}

function hasStructuralDiff(live: LiveWorkout, snap: Routine): boolean {
  const le = live.exercises;
  const se = snap.exercises;
  if (le.length !== se.length) return true;
  for (let i = 0; i < le.length; i++) {
    if (le[i].exercise_id !== se[i].exercise_id) return true;
    if ((le[i].notes ?? null) !== (se[i].notes ?? null)) return true;
    if ((le[i].superset_group ?? null) !== (se[i].superset_group ?? null)) return true;
    if (le[i].sets.length !== se[i].sets.length) return true;
    for (let j = 0; j < le[i].sets.length; j++) {
      const ls = le[i].sets[j];
      const ss = se[i].sets[j];
      if (ls.rest_seconds !== ss.rest_seconds) return true;
      if (ls.set_type !== (ss.set_type ?? "normal")) return true;
    }
  }
  return false;
}

// ---- Rest timer state ----
interface RestTimer {
  remaining: number;
  total: number;
  editing: boolean;
  editVal: string;
}

// ---- Finish diff modal ----
function FinishModal({
  onHistoryOnly,
  onUpdateTemplate,
  onSaveAsNew,
  onCancel,
  saving,
}: {
  onHistoryOnly: () => void;
  onUpdateTemplate: () => void;
  onSaveAsNew: (name: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [newName, setNewName] = useState("");

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onCancel} />
      <div
        className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-3xl px-6 pt-5 anim-slide-up"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}
      >
        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-5" />
        <h2 className="font-display text-[22px] font-light mb-1">Cambios detectados</h2>
        <p className="text-[12px] text-neutral-500 mb-5">
          Modificaste ejercicios, series o parámetros respecto a la plantilla.
        </p>

        {/* Option A */}
        <button
          onClick={onHistoryOnly}
          disabled={saving}
          className="w-full text-left px-4 py-3.5 bg-neutral-50 rounded-2xl mb-2 active:bg-neutral-100 disabled:opacity-40 transition"
        >
          <p className="text-[14px] font-medium text-black">Solo guardar en historial</p>
          <p className="text-[12px] text-neutral-500 mt-0.5">La plantilla no se modifica</p>
        </button>

        {/* Option B */}
        <button
          onClick={onUpdateTemplate}
          disabled={saving}
          className="w-full text-left px-4 py-3.5 bg-neutral-50 rounded-2xl mb-2 active:bg-neutral-100 disabled:opacity-40 transition"
        >
          <p className="text-[14px] font-medium text-black">Actualizar plantilla y guardar</p>
          <p className="text-[12px] text-neutral-500 mt-0.5">La rutina existente se actualiza</p>
        </button>

        {/* Option C */}
        <div className="bg-neutral-50 rounded-2xl px-4 py-3.5 mb-4">
          <p className="text-[14px] font-medium text-black mb-2.5">Guardar como nueva rutina</p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la nueva rutina"
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-neutral-400 transition placeholder:text-neutral-300 mb-2.5"
          />
          <button
            onClick={() => newName.trim() && onSaveAsNew(newName.trim())}
            disabled={!newName.trim() || saving}
            className="w-full bg-black text-white rounded-xl py-2.5 text-[13px] font-medium disabled:opacity-30 active:scale-[0.99] transition"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>

        <button
          onClick={onCancel}
          disabled={saving}
          className="w-full text-[13px] text-neutral-400 py-2"
        >
          Cancelar
        </button>
      </div>
    </>
  );
}

// ---- Page ----
export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [liveWorkout, setLiveWorkout] = useState<LiveWorkout | null>(null);
  const [templateSnapshot, setTemplateSnapshot] = useState<Routine | null>(null);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const initRef = useRef(false);
  const beeped = useRef(false);

  // Init: load routine + prefs, clone to live state, create workout record
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      const [r, hist, { data: authData }] = await Promise.all([
        getRoutine(id),
        getLastPerformance(),
        supabase.auth.getUser(),
      ]);
      if (!r) return;

      if (authData.user) {
        const prefs = await getUserProfile(authData.user.id);
        setSoundEnabled(prefs?.sound_enabled ?? true);
        setVibrationEnabled(prefs?.vibration_enabled ?? true);
      }

      setTemplateSnapshot(r);

      const live: LiveWorkout = {
        routine_id: r.id,
        routine_name: r.name,
        started_at: Date.now(),
        exercises: r.exercises.map((e) => ({
          exercise_id: e.exercise_id,
          position: e.position,
          notes: e.notes ?? null,
          superset_group: e.superset_group ?? null,
          sets: e.sets.map((s) => ({
            position: s.position,
            weight: s.weight,
            reps: s.reps,
            rest_seconds: s.rest_seconds || 90,
            set_type: s.set_type ?? "normal",
            done: false,
            actual_weight: hist[e.exercise_id]?.weight ?? null,
            actual_reps: s.reps,
          })),
        })),
      };
      setLiveWorkout(live);

      const wid = await startWorkout(r.id, r.name);
      setWorkoutId(wid);
    })();
  }, [id]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [startedAt]);

  // Rest countdown + bell at zero
  useEffect(() => {
    if (!restTimer || restTimer.editing) return;
    if (restTimer.remaining <= 0) {
      if (!beeped.current) {
        beeped.current = true;
        playBell(soundEnabled, vibrationEnabled);
      }
      return;
    }
    beeped.current = false;
    const t = setTimeout(
      () => setRestTimer((prev) => (prev ? { ...prev, remaining: prev.remaining - 1 } : null)),
      1000
    );
    return () => clearTimeout(t);
  }, [restTimer, soundEnabled, vibrationEnabled]);

  // Toggle set done — superset-aware rest timer start
  const handleToggleSet = useCallback(
    (exIdx: number, setIdx: number) => {
      if (!liveWorkout) return;

      const exs = liveWorkout.exercises.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, done: !s.done } : s)) }
          : ex
      );
      const updatedSet = exs[exIdx].sets[setIdx];
      const updatedEx = exs[exIdx];
      setLiveWorkout({ ...liveWorkout, exercises: exs });

      if (updatedSet.done) {
        const nextEx = exs[exIdx + 1];
        const inSuperset = updatedEx.superset_group !== null;
        const sameGroup = inSuperset && nextEx?.superset_group === updatedEx.superset_group;
        const partnerIncomplete = sameGroup && nextEx.sets.some((s) => !s.done);

        if (!partnerIncomplete && updatedSet.rest_seconds > 0) {
          beeped.current = false;
          setRestTimer({
            remaining: updatedSet.rest_seconds,
            total: updatedSet.rest_seconds,
            editing: false,
            editVal: "",
          });
        }
      }
    },
    [liveWorkout]
  );

  const adjustRest = useCallback((delta: number) => {
    setRestTimer((prev) =>
      prev ? { ...prev, remaining: Math.max(0, prev.remaining + delta) } : null
    );
  }, []);

  const commitRestEdit = () => {
    setRestTimer((prev) => {
      if (!prev) return null;
      const n = parseInt(prev.editVal, 10);
      if (!isNaN(n) && n > 0) return { ...prev, remaining: n, total: n, editing: false, editVal: "" };
      return { ...prev, editing: false, editVal: "" };
    });
  };

  const persistSets = async (wid: string) => {
    if (!liveWorkout) return;
    for (const ex of liveWorkout.exercises) {
      for (const s of ex.sets) {
        await saveWorkoutSet({
          workoutId: wid,
          exerciseId: ex.exercise_id,
          position: ex.position,
          setPosition: s.position,
          weight: s.actual_weight,
          reps: s.actual_reps,
          done: s.done,
          setType: s.set_type,
        });
      }
    }
    await finishWorkout(wid, elapsed);
  };

  const doSave = async (opts: { updateTemplate?: boolean; newRoutineName?: string }) => {
    if (!workoutId || !liveWorkout || !templateSnapshot) return;
    setFinishing(true);
    setShowDiffModal(false);
    try {
      if (opts.updateTemplate) {
        await saveRoutine({
          id: templateSnapshot.id,
          name: templateSnapshot.name,
          exercises: liveToRoutineExercises(liveWorkout.exercises),
        });
      }
      if (opts.newRoutineName) {
        await saveRoutine({
          name: opts.newRoutineName,
          exercises: liveToRoutineExercises(liveWorkout.exercises),
        });
      }
      await persistSets(workoutId);
      router.push("/");
    } catch (e: any) {
      alert("Error al finalizar: " + e.message);
      setFinishing(false);
    }
  };

  const handleFinish = () => {
    if (!liveWorkout || !templateSnapshot || !workoutId) return;
    if (hasStructuralDiff(liveWorkout, templateSnapshot)) {
      setShowDiffModal(true);
    } else {
      doSave({});
    }
  };

  if (!liveWorkout) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-[13px] text-neutral-400">Iniciando…</p>
      </div>
    );
  }

  const completed = liveWorkout.exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.done).length,
    0
  );
  const total = liveWorkout.exercises.reduce((acc, e) => acc + e.sets.length, 0);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-neutral-100 flex-shrink-0">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">Tiempo</p>
          <p className="text-[14px] font-medium text-black tabular-nums">{formatTime(elapsed)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">Series</p>
          <p className="text-[14px] font-medium text-black tabular-nums">
            {completed}/{total}
          </p>
        </div>
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="bg-black text-white px-4 py-2 rounded-xl text-[13px] font-medium active:scale-95 disabled:opacity-50 transition"
        >
          {finishing ? "…" : "Terminar"}
        </button>
      </div>

      {/* Routine name */}
      <div className="px-7 pt-4 pb-2 flex-shrink-0">
        <h1 className="font-display text-[26px] leading-tight font-light">
          {liveWorkout.routine_name}
        </h1>
      </div>

      {/* Live editor fills the remaining space */}
      <RoutineEditor
        mode="live"
        exercises={liveWorkout.exercises}
        onChange={(exs) =>
          setLiveWorkout((prev) => (prev ? { ...prev, exercises: exs } : prev))
        }
        onToggleSet={handleToggleSet}
      />

      {/* Rest timer overlay */}
      {restTimer && (
        <div
          className="fixed left-0 right-0 anim-slide-up z-30"
          style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="h-1 bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-1000 ease-linear"
              style={{
                width: `${restTimer.total > 0 ? (restTimer.remaining / restTimer.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="bg-black text-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60 mb-0.5">Descanso</p>
              {restTimer.editing ? (
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={restTimer.editVal}
                  onChange={(e) =>
                    setRestTimer((prev) => (prev ? { ...prev, editVal: e.target.value } : null))
                  }
                  onBlur={commitRestEdit}
                  onKeyDown={(e) => e.key === "Enter" && commitRestEdit()}
                  placeholder={String(restTimer.remaining)}
                  className="font-display text-[28px] leading-none tabular-nums bg-transparent outline-none w-24 border-b border-white/40"
                />
              ) : (
                <button
                  onClick={() =>
                    setRestTimer((prev) =>
                      prev ? { ...prev, editing: true, editVal: String(prev.remaining) } : null
                    )
                  }
                  className="font-display text-[28px] leading-none tabular-nums text-left"
                >
                  {formatTime(restTimer.remaining)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustRest(-15)}
                className="bg-white/10 text-white px-2.5 py-2 rounded-lg text-[12px]"
              >
                −15s
              </button>
              <button
                onClick={() => adjustRest(15)}
                className="bg-white/10 text-white px-2.5 py-2 rounded-lg text-[12px]"
              >
                +15s
              </button>
              <button
                onClick={() => setRestTimer(null)}
                className="bg-white text-black w-8 h-8 rounded-lg flex items-center justify-center"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diff modal */}
      {showDiffModal && (
        <FinishModal
          onHistoryOnly={() => doSave({})}
          onUpdateTemplate={() => doSave({ updateTemplate: true })}
          onSaveAsNew={(name) => doSave({ newRoutineName: name })}
          onCancel={() => setShowDiffModal(false)}
          saving={finishing}
        />
      )}
    </div>
  );
}
