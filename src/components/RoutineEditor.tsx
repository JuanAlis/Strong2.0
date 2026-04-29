"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X, GripVertical } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import ExercisePicker from "@/components/ExercisePicker";
import AnatomyModel from "@/components/AnatomyModel";
import { getExercise } from "@/data/exercises";
import { saveRoutine, getRoutine, getLastPerformance, type RoutineExercise } from "@/lib/db";

// Extend with a stable drag key for new (unsaved) exercises
type LocalExercise = RoutineExercise & { _key: string };

function withKey(ex: RoutineExercise, idx: number): LocalExercise {
  return { ...ex, _key: ex.id ?? `new-${idx}-${ex.exercise_id}-${Date.now()}` };
}

interface Props {
  routineId?: string;
}

export default function RoutineEditor({ routineId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState<Record<string, { weight: number; reps: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLastPerformance().then(setHistory).catch(() => {});
    if (routineId) {
      getRoutine(routineId).then((r) => {
        if (r) {
          setName(r.name);
          setExercises(r.exercises.map(withKey));
        }
      });
    } else {
      setShowPicker(true);
    }
  }, [routineId]);

  const addExercises = (ids: string[]) => {
    const now = Date.now();
    const newExercises: LocalExercise[] = ids.map((id, i) => {
      const last = history[id];
      return {
        _key: `new-${now}-${i}-${id}`,
        exercise_id: id,
        position: exercises.length + i,
        notes: null,
        sets: [0, 1, 2].map((j) => ({
          position: j,
          weight: last?.weight ?? null,
          reps: last?.reps ?? 10,
          rest_seconds: 90,
        })),
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
    next[exIdx] = {
      ...next[exIdx],
      sets: [
        ...next[exIdx].sets,
        {
          position: next[exIdx].sets.length,
          weight: last?.weight ?? null,
          reps: last?.reps ?? 10,
          rest_seconds: last?.rest_seconds ?? 90,
        },
      ],
    };
    setExercises(next);
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    const next = [...exercises];
    next[exIdx] = {
      ...next[exIdx],
      sets: next[exIdx].sets.filter((_, i) => i !== setIdx),
    };
    setExercises(next);
  };

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps" | "rest_seconds",
    value: string
  ) => {
    const next = [...exercises];
    const sets = [...next[exIdx].sets];
    sets[setIdx] = { ...sets[setIdx], [field]: value === "" ? null : Number(value) };
    next[exIdx] = { ...next[exIdx], sets };
    setExercises(next);
  };

  const updateNotes = (exIdx: number, value: string) => {
    const next = [...exercises];
    next[exIdx] = { ...next[exIdx], notes: value || null };
    setExercises(next);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(exercises);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setExercises(reordered.map((ex, i) => ({ ...ex, position: i })));
  };

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);
    try {
      const toSave = exercises.map(({ _key, ...ex }) => ex);
      const id = await saveRoutine({ id: routineId, name: name.trim(), exercises: toSave });
      router.push(`/routine/${id}`);
    } catch (e: any) {
      alert("Error al guardar: " + e.message);
      setSaving(false);
    }
  };

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

  const canSave = name.trim() && exercises.length > 0;

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

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="exercises">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {exercises.map((ex, exIdx) => {
                  const meta = getExercise(ex.exercise_id);
                  if (!meta) return null;
                  const last = history[ex.exercise_id];
                  return (
                    <Draggable key={ex._key} draggableId={ex._key} index={exIdx}>
                      {(drag, snapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={`mb-7 transition-shadow ${
                            snapshot.isDragging
                              ? "shadow-lg rounded-2xl bg-white scale-[1.02] ring-1 ring-neutral-200"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {/* Drag handle */}
                            <div
                              {...drag.dragHandleProps}
                              className="text-neutral-300 touch-none flex-shrink-0 p-1 -ml-1"
                            >
                              <GripVertical size={16} strokeWidth={1.5} />
                            </div>
                            <div className="w-10 h-12 flex items-center justify-center flex-shrink-0">
                              <AnatomyModel
                                primary={meta.primary}
                                secondary={meta.secondary}
                                view="front"
                                size={28}
                              />
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
                            <span />
                          </div>

                          {ex.sets.map((set, setIdx) => (
                            <div
                              key={setIdx}
                              className="grid grid-cols-[28px_1fr_1fr_1fr_24px] gap-2 items-center mb-1.5"
                            >
                              <span className="text-[12px] tabular-nums text-neutral-500 text-center">
                                {setIdx + 1}
                              </span>
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
                              <button
                                onClick={() => removeSet(exIdx, setIdx)}
                                className="text-neutral-300"
                              >
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

                          {/* Notes */}
                          <textarea
                            value={ex.notes ?? ""}
                            onChange={(e) => updateNotes(exIdx, e.target.value)}
                            placeholder="Nota de técnica (opcional)"
                            rows={1}
                            className="w-full mt-2.5 bg-transparent border-b border-neutral-200 py-1.5 text-[12px] text-neutral-600 placeholder:text-neutral-300 outline-none resize-none focus:border-neutral-400 transition"
                          />
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

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
