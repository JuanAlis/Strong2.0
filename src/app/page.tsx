"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, GripVertical, X, Dumbbell } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { listRoutines, getSchedule, saveSchedule, type Routine } from "@/lib/db";
import { getExercise } from "@/data/exercises";
import BottomNav from "@/components/BottomNav";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function todayIndex() {
  return (new Date().getDay() + 6) % 7; // getDay: 0=Dom..6=Sáb → 0=Lun..6=Dom
}

type Plan = Record<number, string[]>;

function emptyPlan(): Plan {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

export default function Home() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [loading, setLoading] = useState(true);
  const today = todayIndex();

  useEffect(() => {
    Promise.all([listRoutines(), getSchedule()])
      .then(([rs, sched]) => {
        setRoutines(rs);
        setPlan({ ...emptyPlan(), ...sched });
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const routineById = useMemo(
    () => Object.fromEntries(routines.map((r) => [r.id, r])),
    [routines]
  );

  const persist = (p: Plan) => {
    const entries: { routine_id: string; day_of_week: number; position: number }[] = [];
    for (let d = 0; d < 7; d++) {
      (p[d] || []).forEach((rid, i) =>
        entries.push({ routine_id: rid, day_of_week: d, position: i })
      );
    }
    saveSchedule(entries).catch((e) => console.error("No se pudo guardar el plan:", e));
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const routineId = draggableId.split("::")[1];
    const src = source.droppableId;
    const dst = destination.droppableId;

    if (src === "library" && dst === "library") return;
    if (src === dst && source.index === destination.index) return;

    const next: Plan = {};
    for (let d = 0; d < 7; d++) next[d] = [...(plan[d] || [])];

    if (src.startsWith("day-")) {
      next[Number(src.slice(4))].splice(source.index, 1);
    }
    if (dst.startsWith("day-")) {
      const dd = Number(dst.slice(4));
      if (next[dd].includes(routineId)) return; // sin duplicados dentro de un mismo día
      next[dd].splice(destination.index, 0, routineId);
    }
    // dst === "library" → solo se quita del día de origen (desasignar)

    setPlan(next);
    persist(next);
  };

  const removeFromDay = (day: number, index: number) => {
    const next: Plan = {};
    for (let d = 0; d < 7; d++) next[d] = [...(plan[d] || [])];
    next[day].splice(index, 1);
    setPlan(next);
    persist(next);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />

      <div className="px-7 pt-2 pb-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Tu semana</p>
          <h1 className="font-display text-[44px] leading-[0.95] font-light text-black tracking-tight">
            Entrenar<span className="italic">.</span>
          </h1>
        </div>
        <Link
          href="/routine/new"
          className="mb-1 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center active:scale-95 transition flex-shrink-0"
          aria-label="Nueva rutina"
        >
          <Plus size={18} strokeWidth={2} />
        </Link>
      </div>

      {loading ? (
        <p className="text-[13px] text-neutral-400 text-center mt-12">Cargando…</p>
      ) : routines.length === 0 ? (
        <div className="px-7">
          <div className="border border-dashed border-neutral-300 rounded-2xl py-12 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
              <Dumbbell size={20} strokeWidth={1.5} className="text-neutral-400" />
            </div>
            <p className="text-[13px] text-neutral-600 leading-relaxed">
              Crea tu primera rutina.<br />
              <span className="text-neutral-400">Después arrástrala al día que quieras.</span>
            </p>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          {/* Library */}
          <div className="px-7 flex items-baseline justify-between mb-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-black">
              Mis rutinas
            </h2>
            <span className="text-[10px] text-neutral-400">arrastra a un día ↓</span>
          </div>
          <Droppable droppableId="library" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="scroll-area overflow-x-auto px-7 pb-1 flex-shrink-0"
              >
                <div className="flex gap-2 w-max">
                  {routines.map((r, i) => (
                    <Draggable key={r.id} draggableId={`library::${r.id}`} index={i}>
                      {(drag, snap) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={`flex items-center gap-2 bg-white border rounded-xl pl-2 pr-3 py-2.5 ${
                            snap.isDragging
                              ? "shadow-lg ring-1 ring-neutral-200 border-neutral-200"
                              : "border-neutral-200/80"
                          }`}
                        >
                          <span
                            {...drag.dragHandleProps}
                            className="text-neutral-300 touch-none flex-shrink-0"
                          >
                            <GripVertical size={15} strokeWidth={1.5} />
                          </span>
                          <button
                            onClick={() => router.push(`/routine/${r.id}`)}
                            className="text-left"
                          >
                            <p className="text-[13px] font-medium text-black leading-tight whitespace-nowrap">
                              {r.name}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-0.5 whitespace-nowrap">
                              {r.exercises.length} ejercicios
                            </p>
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>

          {/* Week */}
          <div className="flex-1 overflow-y-auto scroll-area px-7 pt-4 pb-28 space-y-2.5">
            {DAYS.map((label, day) => {
              const ids = plan[day] || [];
              const isToday = day === today;
              return (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-1.5 px-0.5">
                    <span
                      className={`text-[12px] font-semibold ${
                        isToday ? "text-black" : "text-neutral-500"
                      }`}
                    >
                      {label}
                    </span>
                    {isToday && (
                      <span className="text-[9px] uppercase tracking-wider bg-black text-white px-1.5 py-0.5 rounded-full">
                        Hoy
                      </span>
                    )}
                  </div>
                  <Droppable droppableId={`day-${day}`}>
                    {(provided, snap) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-2xl border transition min-h-[52px] p-1.5 space-y-1.5 ${
                          snap.isDraggingOver
                            ? "border-black bg-neutral-50"
                            : isToday
                            ? "border-neutral-300"
                            : "border-neutral-200/70 border-dashed"
                        }`}
                      >
                        {ids.length === 0 && !snap.isDraggingOver && (
                          <p className="text-[11px] text-neutral-300 text-center py-2.5">
                            Descanso
                          </p>
                        )}
                        {ids.map((rid, idx) => {
                          const r = routineById[rid];
                          if (!r) return null;
                          const totalSets = r.exercises.reduce(
                            (a, e) => a + e.sets.length,
                            0
                          );
                          return (
                            <Draggable key={`${day}-${rid}`} draggableId={`day-${day}::${rid}`} index={idx}>
                              {(drag, dsnap) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  className={`flex items-center gap-2 bg-white rounded-xl px-2 py-2.5 border ${
                                    dsnap.isDragging
                                      ? "shadow-lg ring-1 ring-neutral-200 border-neutral-200"
                                      : "border-neutral-200/80"
                                  }`}
                                >
                                  <span
                                    {...drag.dragHandleProps}
                                    className="text-neutral-300 touch-none flex-shrink-0"
                                  >
                                    <GripVertical size={16} strokeWidth={1.5} />
                                  </span>
                                  <button
                                    onClick={() => router.push(`/routine/${rid}`)}
                                    className="flex-1 min-w-0 text-left"
                                  >
                                    <p className="text-[14px] font-medium text-black leading-tight truncate">
                                      {r.name}
                                    </p>
                                    <p className="text-[11px] text-neutral-400 mt-0.5">
                                      {r.exercises.length} ejercicios · {totalSets} series
                                    </p>
                                  </button>
                                  <button
                                    onClick={() => removeFromDay(day, idx)}
                                    className="text-neutral-300 p-1 flex-shrink-0"
                                    aria-label="Quitar del día"
                                  >
                                    <X size={15} strokeWidth={1.8} />
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      <BottomNav />
    </div>
  );
}
