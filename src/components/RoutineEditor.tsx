"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X, GripVertical, Check } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import ExercisePicker from "@/components/ExercisePicker";
import AnatomyModel from "@/components/AnatomyModel";
import { getExercise } from "@/data/exercises";
import {
  saveRoutine,
  getRoutine,
  getLastPerformance,
  type RoutineExercise,
  type SetType,
  type LiveExercise,
  type LiveSet,
} from "@/lib/db";

// ---- Template-mode internal type ----
type LocalExercise = RoutineExercise & { _key: string };

function withKey(ex: RoutineExercise, idx: number): LocalExercise {
  return { ...ex, _key: ex.id ?? `new-${idx}-${ex.exercise_id}-${Date.now()}` };
}

const SET_TYPES: SetType[] = ["normal", "warmup", "dropset", "failure"];
const SET_TYPE_LABEL: Record<SetType, string> = {
  normal: "N",
  warmup: "W",
  dropset: "D",
  failure: "F",
};

// ---- Props ----
interface TemplateProps {
  mode?: "template";
  routineId?: string;
}

interface LiveProps {
  mode: "live";
  exercises: LiveExercise[];
  onChange: (exs: LiveExercise[]) => void;
  onToggleSet: (exIdx: number, setIdx: number) => void;
}

type Props = TemplateProps | LiveProps;

// ---- Component ----
export default function RoutineEditor(props: Props) {
  const isLive = props.mode === "live";
  const router = useRouter();

  // Template-mode state
  const [tmplName, setTmplName] = useState("");
  const [tmplExercises, setTmplExercises] = useState<LocalExercise[]>([]);
  const [saving, setSaving] = useState(false);

  // Shared state
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState<Record<string, { weight: number; reps: number }>>({});

  // Live-mode: stable DnD keys for each exercise (parallel array to props.exercises)
  const liveKeyCounter = useRef(0);
  const [liveKeys, setLiveKeys] = useState<string[]>(() => {
    if (props.mode === "live") {
      return props.exercises.map(() => `lk-${liveKeyCounter.current++}`);
    }
    return [];
  });

  // Sync liveKeys length when exercises are added/removed externally
  const prevLiveLenRef = useRef(isLive ? (props as LiveProps).exercises.length : 0);
  useEffect(() => {
    if (!isLive) return;
    const lp = props as LiveProps;
    const diff = lp.exercises.length - liveKeys.length;
    if (diff > 0) {
      setLiveKeys((prev) => [
        ...prev,
        ...Array.from({ length: diff }, () => `lk-${liveKeyCounter.current++}`),
      ]);
    } else if (diff < 0) {
      setLiveKeys((prev) => prev.slice(0, lp.exercises.length));
    }
    prevLiveLenRef.current = lp.exercises.length;
  });

  useEffect(() => {
    getLastPerformance().then(setHistory).catch(() => {});
    if (!isLive) {
      const rId = (props as TemplateProps).routineId;
      if (rId) {
        getRoutine(rId).then((r) => {
          if (r) {
            setTmplName(r.name);
            setTmplExercises(r.exercises.map(withKey));
          }
        });
      } else {
        setShowPicker(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- TEMPLATE MODE handlers ----
  const tmplAddExercises = (ids: string[]) => {
    const now = Date.now();
    const newExercises: LocalExercise[] = ids.map((id, i) => {
      const last = history[id];
      return {
        _key: `new-${now}-${i}-${id}`,
        exercise_id: id,
        position: tmplExercises.length + i,
        notes: null,
        sets: [0, 1, 2].map((j) => ({
          position: j,
          weight: last?.weight ?? null,
          reps: last?.reps ?? 10,
          rest_seconds: 90,
          set_type: "normal" as SetType,
        })),
      };
    });
    setTmplExercises([...tmplExercises, ...newExercises]);
    setShowPicker(false);
  };

  const tmplRemoveExercise = (idx: number) => {
    setTmplExercises(tmplExercises.filter((_, i) => i !== idx));
  };

  const tmplAddSet = (exIdx: number) => {
    const next = [...tmplExercises];
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
          set_type: last?.set_type ?? "normal",
        },
      ],
    };
    setTmplExercises(next);
  };

  const tmplRemoveSet = (exIdx: number, setIdx: number) => {
    const next = [...tmplExercises];
    next[exIdx] = {
      ...next[exIdx],
      sets: next[exIdx].sets.filter((_, i) => i !== setIdx),
    };
    setTmplExercises(next);
  };

  const tmplUpdateSet = (
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps" | "rest_seconds",
    value: string
  ) => {
    const next = [...tmplExercises];
    const sets = [...next[exIdx].sets];
    sets[setIdx] = { ...sets[setIdx], [field]: value === "" ? null : Number(value) };
    next[exIdx] = { ...next[exIdx], sets };
    setTmplExercises(next);
  };

  const tmplUpdateNotes = (exIdx: number, value: string) => {
    const next = [...tmplExercises];
    next[exIdx] = { ...next[exIdx], notes: value || null };
    setTmplExercises(next);
  };

  const tmplDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(tmplExercises);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setTmplExercises(reordered.map((ex, i) => ({ ...ex, position: i })));
  };

  const handleTmplSave = async () => {
    if (!tmplName.trim() || tmplExercises.length === 0) return;
    setSaving(true);
    try {
      const toSave = tmplExercises.map(({ _key, ...ex }) => ex);
      const id = await saveRoutine({
        id: (props as TemplateProps).routineId,
        name: tmplName.trim(),
        exercises: toSave,
      });
      router.push(`/routine/${id}`);
    } catch (e: any) {
      alert("Error al guardar: " + e.message);
      setSaving(false);
    }
  };

  // ---- LIVE MODE handlers ----
  const lp = isLive ? (props as LiveProps) : null;

  const liveAddExercises = (ids: string[]) => {
    if (!lp) return;
    const now = Date.now();
    const newKeys = ids.map(() => `lk-${liveKeyCounter.current++}`);
    setLiveKeys((prev) => [...prev, ...newKeys]);
    const newExs: LiveExercise[] = ids.map((id, i) => ({
      exercise_id: id,
      position: lp.exercises.length + i,
      notes: null,
      superset_group: null,
      sets: [0, 1, 2].map((j) => ({
        position: j,
        weight: history[id]?.weight ?? null,
        reps: history[id]?.reps ?? 10,
        rest_seconds: 90,
        set_type: "normal" as SetType,
        done: false,
        actual_weight: null,
        actual_reps: null,
      })),
    }));
    void now;
    lp.onChange([...lp.exercises, ...newExs]);
    setShowPicker(false);
  };

  const liveRemoveExercise = (idx: number) => {
    if (!lp) return;
    setLiveKeys((prev) => prev.filter((_, i) => i !== idx));
    lp.onChange(
      lp.exercises.filter((_, i) => i !== idx).map((ex, i) => ({ ...ex, position: i }))
    );
  };

  const liveAddSet = (exIdx: number) => {
    if (!lp) return;
    const ex = lp.exercises[exIdx];
    const last = ex.sets[ex.sets.length - 1];
    const newSet: LiveSet = {
      position: ex.sets.length,
      weight: last?.weight ?? null,
      reps: last?.reps ?? 10,
      rest_seconds: last?.rest_seconds ?? 90,
      set_type: last?.set_type ?? "normal",
      done: false,
      actual_weight: null,
      actual_reps: null,
    };
    lp.onChange(
      lp.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: [...e.sets, newSet] } : e
      )
    );
  };

  const liveRemoveSet = (exIdx: number, setIdx: number) => {
    if (!lp) return;
    lp.onChange(
      lp.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e
      )
    );
  };

  const liveUpdateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof Pick<LiveSet, "weight" | "reps" | "rest_seconds" | "actual_weight" | "actual_reps">,
    value: string
  ) => {
    if (!lp) return;
    const parsed = value === "" ? null : Number(value);
    lp.onChange(
      lp.exercises.map((e, i) =>
        i === exIdx
          ? {
              ...e,
              sets: e.sets.map((s, j) => (j === setIdx ? { ...s, [field]: parsed } : s)),
            }
          : e
      )
    );
  };

  const liveUpdateSetType = (exIdx: number, setIdx: number, type: SetType) => {
    if (!lp) return;
    lp.onChange(
      lp.exercises.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.map((s, j) => (j === setIdx ? { ...s, set_type: type } : s)) }
          : e
      )
    );
  };

  const liveUpdateNotes = (exIdx: number, value: string) => {
    if (!lp) return;
    lp.onChange(
      lp.exercises.map((e, i) => (i === exIdx ? { ...e, notes: value || null } : e))
    );
  };

  const liveDragEnd = (result: DropResult) => {
    if (!result.destination || !lp) return;
    const reorderedExs = Array.from(lp.exercises);
    const [removedEx] = reorderedExs.splice(result.source.index, 1);
    reorderedExs.splice(result.destination.index, 0, removedEx);

    const reorderedKeys = Array.from(liveKeys);
    const [removedKey] = reorderedKeys.splice(result.source.index, 1);
    reorderedKeys.splice(result.destination.index, 0, removedKey);
    setLiveKeys(reorderedKeys);

    lp.onChange(reorderedExs.map((ex, i) => ({ ...ex, position: i })));
  };

  const liveToggleSuperset = (exIdx: number) => {
    if (!lp) return;
    const exs = lp.exercises;
    const ex = exs[exIdx];
    const nextEx = exs[exIdx + 1];
    if (!nextEx) return;

    const alreadyGrouped =
      ex.superset_group !== null && ex.superset_group === nextEx.superset_group;

    const maxGroup = exs.reduce((m, e) => Math.max(m, e.superset_group ?? 0), 0);
    const newGroup: number | null = alreadyGrouped ? null : maxGroup + 1;

    lp.onChange(
      exs.map((e, i) =>
        i === exIdx || i === exIdx + 1 ? { ...e, superset_group: newGroup } : e
      )
    );
  };

  // ---- Picker routing ----
  if (showPicker) {
    const alreadyAdded = isLive
      ? lp!.exercises.map((e) => e.exercise_id)
      : tmplExercises.map((e) => e.exercise_id);

    return (
      <ExercisePicker
        alreadyAdded={alreadyAdded}
        onClose={() => {
          if (!isLive && tmplExercises.length === 0 && !(props as TemplateProps).routineId) {
            router.push("/");
          } else {
            setShowPicker(false);
          }
        }}
        onConfirm={isLive ? liveAddExercises : tmplAddExercises}
      />
    );
  }

  // ---- TEMPLATE MODE render ----
  if (!isLive) {
    const canSave = tmplName.trim() && tmplExercises.length > 0;
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
            onClick={handleTmplSave}
            disabled={!canSave || saving}
            className="text-[14px] font-medium text-black disabled:text-neutral-300"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-area px-7 pb-32">
          <input
            autoFocus
            value={tmplName}
            onChange={(e) => setTmplName(e.target.value)}
            placeholder="Nombre de la rutina"
            className="w-full font-display text-[30px] leading-tight bg-transparent outline-none placeholder:text-neutral-300 mb-6"
          />

          <DragDropContext onDragEnd={tmplDragEnd}>
            <Droppable droppableId="exercises">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {tmplExercises.map((ex, exIdx) => {
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
                                <p className="text-[14px] font-medium text-black leading-tight">
                                  {meta.name}
                                </p>
                                <p className="text-[11px] text-neutral-400 mt-0.5">
                                  {meta.equipment}
                                  {last && ` · Última: ${last.weight}kg × ${last.reps}`}
                                </p>
                              </div>
                              <button
                                onClick={() => tmplRemoveExercise(exIdx)}
                                className="text-neutral-300 p-1"
                              >
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
                                  onChange={(v) => tmplUpdateSet(exIdx, setIdx, "weight", v)}
                                  placeholder="—"
                                />
                                <NumInput
                                  value={set.reps ?? ""}
                                  onChange={(v) => tmplUpdateSet(exIdx, setIdx, "reps", v)}
                                  placeholder="—"
                                />
                                <NumInput
                                  value={set.rest_seconds}
                                  onChange={(v) => tmplUpdateSet(exIdx, setIdx, "rest_seconds", v)}
                                  placeholder="s"
                                />
                                <button
                                  onClick={() => tmplRemoveSet(exIdx, setIdx)}
                                  className="text-neutral-300"
                                >
                                  <X size={14} strokeWidth={1.5} />
                                </button>
                              </div>
                            ))}

                            <button
                              onClick={() => tmplAddSet(exIdx)}
                              className="w-full mt-2 py-2 text-[12px] text-neutral-500 bg-neutral-50 rounded-lg active:bg-neutral-100"
                            >
                              + Añadir serie
                            </button>

                            <textarea
                              value={ex.notes ?? ""}
                              onChange={(e) => tmplUpdateNotes(exIdx, e.target.value)}
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

  // ---- LIVE MODE render ----
  return (
    <div className="flex-1 overflow-y-auto scroll-area px-7 pb-44">
      <DragDropContext onDragEnd={liveDragEnd}>
        <Droppable droppableId="live-exercises">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {lp!.exercises.map((ex, exIdx) => {
                const meta = getExercise(ex.exercise_id);
                if (!meta) return null;
                const last = history[ex.exercise_id];
                const dragKey = liveKeys[exIdx] ?? `lk-fallback-${exIdx}`;
                const inSuperset = ex.superset_group !== null;
                const nextEx = lp!.exercises[exIdx + 1];
                const groupedWithNext =
                  inSuperset && nextEx?.superset_group === ex.superset_group;

                return (
                  <Draggable key={dragKey} draggableId={dragKey} index={exIdx}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`mb-2 transition-shadow ${
                          snapshot.isDragging
                            ? "shadow-lg rounded-2xl bg-white scale-[1.01] ring-1 ring-neutral-200"
                            : ""
                        }`}
                      >
                        {/* Superset badge */}
                        {inSuperset && (
                          <div className="mb-1 flex items-center gap-1.5">
                            <div className="h-px flex-1 bg-neutral-200" />
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 px-1">
                              Superserie {ex.superset_group}
                            </span>
                            <div className="h-px flex-1 bg-neutral-200" />
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-2">
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
                            <p className="text-[14px] font-medium text-black leading-tight">
                              {meta.name}
                            </p>
                            {last && (
                              <p className="text-[10px] text-neutral-400 mt-0.5 tabular-nums">
                                {meta.equipment} · Última: {last.weight}kg × {last.reps}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => liveRemoveExercise(exIdx)}
                            className="text-neutral-300 p-1"
                          >
                            <X size={16} strokeWidth={1.8} />
                          </button>
                        </div>

                        {/* Live set grid header */}
                        <div className="grid grid-cols-[20px_22px_1fr_1fr_1fr_1fr_40px_28px_18px] gap-1 px-0.5 mb-1">
                          <span className="text-[9px] uppercase tracking-wide text-neutral-400">#</span>
                          <span className="text-[9px] uppercase tracking-wide text-neutral-400">T</span>
                          <span className="text-[9px] uppercase tracking-wide text-neutral-400 text-center">kg</span>
                          <span className="text-[9px] uppercase tracking-wide text-neutral-400 text-center">rep</span>
                          <span className="text-[9px] uppercase tracking-wide text-neutral-400 text-center">kg*</span>
                          <span className="text-[9px] uppercase tracking-wide text-neutral-400 text-center">rep*</span>
                          <span className="text-[9px] uppercase tracking-wide text-neutral-400 text-center">s</span>
                          <span />
                          <span />
                        </div>

                        {ex.sets.map((set, setIdx) => {
                          const nextType =
                            SET_TYPES[(SET_TYPES.indexOf(set.set_type) + 1) % SET_TYPES.length];
                          return (
                            <div
                              key={setIdx}
                              className={`grid grid-cols-[20px_22px_1fr_1fr_1fr_1fr_40px_28px_18px] gap-1 items-center mb-1.5 py-0.5 rounded-lg transition ${
                                set.done ? "bg-neutral-100" : ""
                              }`}
                            >
                              {/* Set number */}
                              <span className="text-[11px] tabular-nums text-neutral-500 text-center">
                                {setIdx + 1}
                              </span>

                              {/* Type tag */}
                              <button
                                onClick={() => liveUpdateSetType(exIdx, setIdx, nextType)}
                                className="w-[22px] h-[22px] rounded-full border border-neutral-300 text-[9px] font-semibold text-neutral-500 flex items-center justify-center flex-shrink-0 active:bg-neutral-100 transition"
                              >
                                {SET_TYPE_LABEL[set.set_type]}
                              </button>

                              {/* Target kg */}
                              <SmallNumInput
                                value={set.weight ?? ""}
                                onChange={(v) => liveUpdateSet(exIdx, setIdx, "weight", v)}
                                placeholder="—"
                              />

                              {/* Target reps */}
                              <SmallNumInput
                                value={set.reps ?? ""}
                                onChange={(v) => liveUpdateSet(exIdx, setIdx, "reps", v)}
                                placeholder="—"
                              />

                              {/* Actual kg */}
                              <SmallNumInput
                                value={set.actual_weight ?? ""}
                                onChange={(v) => liveUpdateSet(exIdx, setIdx, "actual_weight", v)}
                                placeholder={set.weight?.toString() ?? "—"}
                                highlight
                              />

                              {/* Actual reps */}
                              <SmallNumInput
                                value={set.actual_reps ?? ""}
                                onChange={(v) => liveUpdateSet(exIdx, setIdx, "actual_reps", v)}
                                placeholder={set.reps?.toString() ?? "—"}
                                highlight
                              />

                              {/* Rest seconds */}
                              <SmallNumInput
                                value={set.rest_seconds}
                                onChange={(v) => liveUpdateSet(exIdx, setIdx, "rest_seconds", v)}
                                placeholder="s"
                              />

                              {/* Done checkbox */}
                              <button
                                onClick={() => lp!.onToggleSet(exIdx, setIdx)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
                                  set.done ? "bg-black text-white" : "bg-neutral-100 text-neutral-400"
                                }`}
                              >
                                <Check size={13} strokeWidth={2.5} />
                              </button>

                              {/* Remove set */}
                              <button
                                onClick={() => liveRemoveSet(exIdx, setIdx)}
                                className="text-neutral-300 flex items-center justify-center"
                              >
                                <X size={13} strokeWidth={1.5} />
                              </button>
                            </div>
                          );
                        })}

                        <button
                          onClick={() => liveAddSet(exIdx)}
                          className="w-full mt-1.5 py-2 text-[12px] text-neutral-500 bg-neutral-50 rounded-lg active:bg-neutral-100"
                        >
                          + Añadir serie
                        </button>

                        <textarea
                          value={ex.notes ?? ""}
                          onChange={(e) => liveUpdateNotes(exIdx, e.target.value)}
                          placeholder="Nota de técnica (opcional)"
                          rows={1}
                          className="w-full mt-2 bg-transparent border-b border-neutral-200 py-1.5 text-[12px] text-neutral-600 placeholder:text-neutral-300 outline-none resize-none focus:border-neutral-400 transition"
                        />

                        {/* Superset toggle (between exercises) */}
                        {exIdx < lp!.exercises.length - 1 && (
                          <button
                            onClick={() => liveToggleSuperset(exIdx)}
                            className="w-full mt-2 mb-1 py-1.5 text-[11px] text-neutral-400 flex items-center justify-center gap-1 active:text-neutral-600 transition"
                          >
                            {groupedWithNext ? "✕ Quitar de superserie" : "+ Añadir a superserie"}
                          </button>
                        )}

                        {/* Connector line for superset */}
                        {groupedWithNext && (
                          <div className="flex justify-center">
                            <div className="w-0.5 h-4 bg-neutral-300 rounded-full" />
                          </div>
                        )}
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
        className="w-full mt-4 border border-dashed border-neutral-300 rounded-xl py-4 text-[13px] text-neutral-600 flex items-center justify-center gap-1.5 active:bg-neutral-50 transition"
      >
        <Plus size={14} strokeWidth={1.8} />
        Añadir ejercicio
      </button>
    </div>
  );
}

// ---- Input helpers ----
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

function SmallNumInput({
  value,
  onChange,
  placeholder,
  highlight,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder: string;
  highlight?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md py-1.5 text-[12px] text-center tabular-nums text-black outline-none transition placeholder:text-neutral-300 ${
        highlight
          ? "bg-neutral-200/60 focus:bg-neutral-200 placeholder:text-neutral-400"
          : "bg-neutral-100 focus:bg-neutral-200/70"
      }`}
    />
  );
}
