"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X } from "lucide-react";
import ExercisePicker from "@/components/ExercisePicker";
import AnatomyModel from "@/components/AnatomyModel";
import { getExercise } from "@/data/exercises";
import { saveRoutine, getRoutine, getLastPerformance, type RoutineExercise } from "@/lib/db";

interface Props {
  routineId?: string; // for editing
}

export default function RoutineEditor({ routineId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState<Record<string, { weight: number; reps: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLastPerformance().then(setHistory).catch(() => {});
    if (routineId) {
      getRoutine(routineId).then((r) => {
        if (r) {
          setName(r.name);
          setExercises(r.exercises);
        }
      });
    } else {
      // New routine starts with picker open
      setShowPicker(true);
    }
  }, [routineId]);

  const addExercises = (ids: string[]) => {
    const newExercises: RoutineExercise[] = ids.map((id, i) => {
      const last = history[id];
      const defaultWeight = last?.weight ?? null;
      const defaultReps = last?.reps ?? 10;
      return {
        exercise_id: id,
        position: exercises.length + i,
        sets: [
          { position: 0, weight: defaultWeight, reps: defaultReps, rest_seconds: 90 },
          { position: 1, weight: defaultWeight, reps: defaultReps, rest_seconds: 90 },
          { position: 2, weight: defaultWeight, reps: defaultReps, rest_seconds: 90 },
        ],
      };
    });
    setExercises([...exercises, ...newExercises]);
    setShowPicker(false);
  };

  const removeExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  const addSet = (exIdx: number) => {
    const next = [...exercises];
    const last = next[exIdx].sets[next[exIdx].sets.length - 1];
    next[exIdx].sets.push({
      position: next[exIdx].sets.length,
      weight: last?.weight ?? null,
      reps: last?.reps ?? 10,
      rest_seconds: last?.rest_seconds ?? 90,
    });
    setExercises(next);
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    const next = [...exercises];
    next[exIdx].sets = next[exIdx].sets.filter((_, i) => i !== setIdx);
    setExercises(next);
  };

  const updateSet = (exIdx: number, setIdx: number, field: "weight" | "reps" | "rest_seconds", value: string) => {
    const next = [...exercises];
    const numVal = value === "" ? null : Number(value);
    (next[exIdx].sets[setIdx] as any)[field] = numVal;
    setExercises(next);
  };

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);
    try {
      const id = await saveRoutine({ id: routineId, name: name.trim(), exercises });
      router.push(`/routine/${id}`);
    } catch (e: any) {
      alert("Error al guardar: " + e.message);
      setSaving(false);
    }
  };

  const canSave = name.trim() && exercises.length > 0;

  if (showPicker) {
    return (
      <ExercisePicker
        alreadyAdded={exercises.map((e) => e.exercise_id)}
        onClose={() => {
          if (exercises.length === 0 && !routineId) router.push("/");
          else setShowPicker(false);
        }}
        onConfirm={addExercises}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />
      <div className="px-5 pt-2 pb-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-neutral-100"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="text-[14px] font-medium text-black disabled:text-neutral-300"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-7 pb-32">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la rutina"
          className="w-full font-display text-[30px] leading-tight bg-transparent outline-none placeholder:text-neutral-300 mb-6"
        />

        {exercises.map((ex, exIdx) => {
          const meta = getExercise(ex.exercise_id);
          if (!meta) return null;
          const last = history[ex.exercise_id];
          return (
            <div key={exIdx} className="mb-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-12 flex items-center justify-center flex-shrink-0">
                  <AnatomyModel primary={meta.primary} secondary={meta.secondary} view="front" size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-black leading-tight">{meta.name}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {meta.equipment}
                    {last && ` · Última: ${last.weight}kg × ${last.reps}`}
                  </p>
                </div>
                <button onClick={() => removeExercise(exIdx)} className="text-neutral-300 p-1">
                  <X size={16} strokeWidth={1.8} />
                </button>
              </div>

              <div className="grid grid-cols-[28px_1fr_1fr_1fr_24px] gap-2 px-1 mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">Set</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">kg</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">Reps</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">Desc.</span>
                <span></span>
              </div>

              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className="grid grid-cols-[28px_1fr_1fr_1fr_24px] gap-2 items-center mb-1.5">
                  <span className="text-[12px] tabular-nums text-neutral-500 text-center">{setIdx + 1}</span>
                  <NumInput
                    value={set.weight ?? ""}
                    onChange={(v) => updateSet(exIdx, setIdx, "weight", v)}
                    placeholder="—"
                  />
                  <NumInput
                    value={set.reps ?? ""}
                    onChange={(v) => updateSet(exIdx, setIdx, "reps", v)}
                    placeholder="—"
                  />
                  <NumInput
                    value={set.rest_seconds}
                    onChange={(v) => updateSet(exIdx, setIdx, "rest_seconds", v)}
                    placeholder="s"
                  />
                  <button onClick={() => removeSet(exIdx, setIdx)} className="text-neutral-300">
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addSet(exIdx)}
                className="w-full mt-2 py-2 text-[12px] text-neutral-500 bg-neutral-50 rounded-lg active:bg-neutral-100"
              >
                + Añadir serie
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setShowPicker(true)}
          className="w-full border border-dashed border-neutral-300 rounded-xl py-4 text-[13px] text-neutral-600 flex items-center justify-center gap-1.5 active:bg-neutral-50 transition"
        >
          <Plus size={14} strokeWidth={1.8} />
          Añadir más ejercicios
        </button>
      </div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-neutral-100 rounded-lg py-2 text-[13px] text-center tabular-nums text-black outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
    />
  );
}
