"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import AnatomyModel from "@/components/AnatomyModel";
import {
  getRoutine,
  startWorkout,
  finishWorkout,
  saveWorkoutSet,
  getLastPerformance,
  type Routine,
} from "@/lib/db";
import { getExercise } from "@/data/exercises";

interface LiveSet {
  position: number;
  targetWeight: number | null;
  targetReps: number | null;
  rest: number;
  actualWeight: string;
  actualReps: string;
  done: boolean;
}
interface LiveExercise {
  exerciseId: string;
  position: number;
  notes: string | null;
  sets: LiveSet[];
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext not available
  }
}

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<LiveExercise[]>([]);
  const [history, setHistory] = useState<Record<string, { weight: number; reps: number }>>({});
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<{
    remaining: number;
    total: number;
    editing: boolean;
    editVal: string;
  } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const initRef = useRef(false);
  const beeped = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      const r = await getRoutine(id);
      const hist = await getLastPerformance();
      if (!r) return;
      setRoutine(r);
      setHistory(hist);
      const live: LiveExercise[] = r.exercises.map((e) => ({
        exerciseId: e.exercise_id,
        position: e.position,
        notes: e.notes ?? null,
        sets: e.sets.map((s) => ({
          position: s.position,
          targetWeight: s.weight,
          targetReps: s.reps,
          rest: s.rest_seconds || 90,
          actualWeight: hist[e.exercise_id]?.weight?.toString() ?? s.weight?.toString() ?? "",
          actualReps: s.reps?.toString() ?? "",
          done: false,
        })),
      }));
      setExercises(live);
      const wid = await startWorkout(r.id, r.name);
      setWorkoutId(wid);
      setStartedAt(Date.now());
    })();
  }, [id]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // Rest timer countdown
  useEffect(() => {
    if (!restTimer || restTimer.editing) return;
    if (restTimer.remaining <= 0) {
      if (!beeped.current) {
        beeped.current = true;
        playBeep();
      }
      return;
    }
    beeped.current = false;
    const t = setTimeout(
      () => setRestTimer((prev) => prev ? { ...prev, remaining: prev.remaining - 1 } : null),
      1000
    );
    return () => clearTimeout(t);
  }, [restTimer]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const toggleSet = (exIdx: number, setIdx: number) => {
    const next = [...exercises];
    const set = { ...next[exIdx].sets[setIdx] };
    set.done = !set.done;
    next[exIdx] = { ...next[exIdx], sets: next[exIdx].sets.map((s, i) => (i === setIdx ? set : s)) };
    setExercises(next);
    if (set.done && set.rest > 0) {
      beeped.current = false;
      setRestTimer({ remaining: set.rest, total: set.rest, editing: false, editVal: "" });
    }
  };

  const updateActual = (
    exIdx: number,
    setIdx: number,
    field: "actualWeight" | "actualReps",
    value: string
  ) => {
    const next = [...exercises];
    next[exIdx] = {
      ...next[exIdx],
      sets: next[exIdx].sets.map((s, i) => (i === setIdx ? { ...s, [field]: value } : s)),
    };
    setExercises(next);
  };

  const adjustRest = useCallback((delta: number) => {
    setRestTimer((prev) =>
      prev ? { ...prev, remaining: Math.max(0, prev.remaining + delta) } : null
    );
  }, []);

  const commitRestEdit = () => {
    setRestTimer((prev) => {
      if (!prev) return null;
      const n = parseInt(prev.editVal, 10);
      if (!isNaN(n) && n > 0) {
        return { ...prev, remaining: n, total: n, editing: false, editVal: "" };
      }
      return { ...prev, editing: false, editVal: "" };
    });
  };

  const handleFinish = async () => {
    if (!workoutId) return;
    setFinishing(true);
    try {
      for (const ex of exercises) {
        for (const s of ex.sets) {
          await saveWorkoutSet({
            workoutId,
            exerciseId: ex.exerciseId,
            position: ex.position,
            setPosition: s.position,
            weight: s.actualWeight === "" ? null : Number(s.actualWeight),
            reps: s.actualReps === "" ? null : Number(s.actualReps),
            done: s.done,
          });
        }
      }
      await finishWorkout(workoutId, elapsed);
      router.push("/");
    } catch (e: any) {
      alert("Error al finalizar: " + e.message);
      setFinishing(false);
    }
  };

  if (!routine) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-[13px] text-neutral-400">Iniciando…</p>
      </div>
    );
  }

  const completed = exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.done).length, 0);
  const total = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />
      <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-neutral-100">
        <div className="text-[12px] tabular-nums text-neutral-500">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">Tiempo</p>
          <p className="text-[14px] font-medium text-black">{formatTime(elapsed)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">Series</p>
          <p className="text-[14px] font-medium text-black tabular-nums">{completed}/{total}</p>
        </div>
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="bg-black text-white px-4 py-2 rounded-xl text-[13px] font-medium active:scale-95 disabled:opacity-50"
        >
          {finishing ? "…" : "Terminar"}
        </button>
      </div>

      <div className="px-7 pt-4 pb-3">
        <h1 className="font-display text-[28px] leading-tight font-light">{routine.name}</h1>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-7 pb-40">
        {exercises.map((ex, exIdx) => {
          const meta = getExercise(ex.exerciseId);
          if (!meta) return null;
          const last = history[ex.exerciseId];
          return (
            <div key={exIdx} className="mb-7">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-12 flex items-center justify-center flex-shrink-0">
                  <AnatomyModel primary={meta.primary} secondary={meta.secondary} view="front" size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-black leading-tight">{meta.name}</p>
                  {last && (
                    <p className="text-[10px] text-neutral-400 mt-0.5 tabular-nums">
                      Última: {last.weight} kg × {last.reps}
                    </p>
                  )}
                </div>
              </div>

              {ex.notes && (
                <p className="text-[11px] text-neutral-400 mb-2.5 pl-14 leading-relaxed italic">
                  {ex.notes}
                </p>
              )}

              <div className="grid grid-cols-[28px_1fr_1fr_1fr_36px] gap-2 px-1 mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">Set</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">Anterior</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">kg</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">Reps</span>
                <span />
              </div>

              {ex.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className={`grid grid-cols-[28px_1fr_1fr_1fr_36px] gap-2 items-center mb-1.5 py-1 rounded-lg transition ${
                    set.done ? "bg-neutral-100" : ""
                  }`}
                >
                  <span className="text-[12px] tabular-nums text-neutral-500 text-center">{setIdx + 1}</span>
                  <span className="text-[11px] text-neutral-400 text-center tabular-nums">
                    {last ? `${last.weight}×${last.reps}` : "—"}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.actualWeight}
                    onChange={(e) => updateActual(exIdx, setIdx, "actualWeight", e.target.value)}
                    placeholder={set.targetWeight?.toString() ?? "—"}
                    className="w-full bg-neutral-100 rounded-lg py-2 text-[13px] text-center tabular-nums text-black outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.actualReps}
                    onChange={(e) => updateActual(exIdx, setIdx, "actualReps", e.target.value)}
                    placeholder={set.targetReps?.toString() ?? "—"}
                    className="w-full bg-neutral-100 rounded-lg py-2 text-[13px] text-center tabular-nums text-black outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
                  />
                  <button
                    onClick={() => toggleSet(exIdx, setIdx)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                      set.done ? "bg-black text-white" : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    <Check size={15} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Rest timer */}
      {restTimer && (
        <div
          className="fixed left-0 right-0 anim-slide-up"
          style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Progress bar */}
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
                    setRestTimer((prev) => prev ? { ...prev, editVal: e.target.value } : null)
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
    </div>
  );
}
