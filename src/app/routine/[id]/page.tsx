"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MoreHorizontal, Play, RotateCw } from "lucide-react";
import AnatomyModel from "@/components/AnatomyModel";
import { getRoutine, deleteRoutine, type Routine } from "@/lib/db";
import { getExercise, type Muscle } from "@/data/exercises";

export default function RoutinePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [view, setView] = useState<"front" | "back">("front");
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoutine(id)
      .then(setRoutine)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-[13px] text-neutral-400">Cargando…</p>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-neutral-600 mb-3">Rutina no encontrada</p>
          <Link href="/" className="text-[13px] text-black underline">Volver</Link>
        </div>
      </div>
    );
  }

  const allPrimary = Array.from(
    new Set(routine.exercises.flatMap((e) => getExercise(e.exercise_id)?.primary || []))
  ) as Muscle[];
  const allSecondary = Array.from(
    new Set(routine.exercises.flatMap((e) => getExercise(e.exercise_id)?.secondary || []))
  ).filter((m) => !allPrimary.includes(m as Muscle)) as Muscle[];

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta rutina?")) return;
    await deleteRoutine(id);
    router.push("/");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />
      <div className="px-5 pt-2 pb-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-neutral-100"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <button onClick={() => setShowMenu(true)} className="text-neutral-500">
          <MoreHorizontal size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className="px-7 pb-3">
        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Rutina</p>
        <h1 className="font-display text-[34px] leading-[1] font-light text-black tracking-tight">
          {routine.name}
        </h1>
      </div>

      <div className="px-7 mb-2 flex justify-center relative">
        <button
          onClick={() => setView(view === "front" ? "back" : "front")}
          className="absolute right-7 top-2 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center active:bg-neutral-200"
        >
          <RotateCw size={13} strokeWidth={1.8} />
        </button>
        <AnatomyModel primary={allPrimary} secondary={allSecondary} view={view} size={120} />
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-7 pb-32">
        <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-2">Ejercicios</p>
        {routine.exercises.map((e, i) => {
          const ex = getExercise(e.exercise_id);
          if (!ex) return null;
          return (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-neutral-100">
              <div className="w-10 h-12 flex items-center justify-center flex-shrink-0">
                <AnatomyModel primary={ex.primary} secondary={ex.secondary} view="front" size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-black leading-tight">{ex.name}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {e.sets.length} series · {ex.equipment}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-7 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent">
        <Link
          href={`/workout/${routine.id}`}
          className="w-full bg-black text-white rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Play size={14} fill="white" strokeWidth={0} />
          <span className="text-[15px] font-medium">Entrenar</span>
        </Link>
      </div>

      {showMenu && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setShowMenu(false)}>
          <div className="absolute inset-0 bg-black/40 anim-fade-in" />
          <div
            className="relative w-full bg-white rounded-t-[28px] px-7 pt-3 pb-10 anim-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-4" />
            <div className="space-y-1">
              <Link
                href={`/routine/${routine.id}/edit`}
                className="block w-full text-left py-3 text-[15px] text-black"
              >
                Editar rutina
              </Link>
              <button
                onClick={handleDelete}
                className="w-full text-left py-3 text-[15px] text-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
