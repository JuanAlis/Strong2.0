"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, Dumbbell } from "lucide-react";
import { listRoutines, type Routine } from "@/lib/db";
import { getExercise } from "@/data/exercises";

export default function Home() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRoutines()
      .then(setRoutines)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />

      <div className="px-7 pt-2 pb-5">
        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Inicio</p>
        <h1 className="font-display text-[44px] leading-[0.95] font-light text-black tracking-tight">
          Entrenar<span className="italic">.</span>
        </h1>
      </div>

      <div className="px-7 mb-5">
        <Link
          href="/routine/new"
          className="w-full bg-black text-white rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.99] transition"
        >
          <Plus size={16} strokeWidth={2} />
          <span className="text-[14px] font-medium">Nueva rutina</span>
        </Link>
      </div>

      <div className="px-7 flex items-baseline justify-between mb-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-black">Mis rutinas</h2>
        <span className="text-[11px] text-neutral-400 tabular-nums">{routines.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-7 pb-8">
        {loading ? (
          <p className="text-[13px] text-neutral-400 text-center mt-12">Cargando…</p>
        ) : routines.length === 0 ? (
          <div className="border border-dashed border-neutral-300 rounded-2xl py-12 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
              <Dumbbell size={20} strokeWidth={1.5} className="text-neutral-400" />
            </div>
            <p className="text-[13px] text-neutral-600 leading-relaxed">
              Crea tu primera rutina.<br />
              <span className="text-neutral-400">Selecciona ejercicios y configura las series.</span>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {routines.map((r) => (
              <RoutineCard key={r.id} routine={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoutineCard({ routine }: { routine: Routine }) {
  const totalSets = routine.exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const groups = Array.from(new Set(routine.exercises.map((e) => getExercise(e.exercise_id)?.group).filter(Boolean)));

  return (
    <Link
      href={`/routine/${routine.id}`}
      className="block w-full bg-white border border-neutral-200/80 rounded-2xl p-4 active:bg-neutral-50 transition"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="font-display text-[20px] leading-tight text-black">{routine.name}</p>
        <ChevronRight size={18} strokeWidth={1.5} className="text-neutral-300 mt-1" />
      </div>
      <div className="flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
        <span>{routine.exercises.length} ejercicios</span>
        <span className="text-neutral-300">·</span>
        <span className="tabular-nums">{totalSets} series</span>
        {groups.length > 0 && (
          <>
            <span className="text-neutral-300">·</span>
            <span className="truncate">{groups.slice(0, 3).join(", ")}</span>
          </>
        )}
      </div>
    </Link>
  );
}
