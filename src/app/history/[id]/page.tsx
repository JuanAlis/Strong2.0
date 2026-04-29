"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { getWorkoutDetail, deleteWorkout, type WorkoutDetail } from "@/lib/db";
import { getExercise } from "@/data/exercises";
import AnatomyModel from "@/components/AnatomyModel";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function WorkoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getWorkoutDetail(id)
      .then(setWorkout)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este entrenamiento? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      await deleteWorkout(id);
      router.push("/history");
    } catch (e: any) {
      alert("Error: " + e.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-[13px] text-neutral-400">Cargando…</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-neutral-600 mb-3">Entrenamiento no encontrado</p>
          <Link href="/history" className="text-[13px] text-black underline">Volver</Link>
        </div>
      </div>
    );
  }

  // Group sets by exercise
  const byExercise: Record<string, typeof workout.sets> = {};
  workout.sets.forEach((s) => {
    if (!byExercise[s.exercise_id]) byExercise[s.exercise_id] = [];
    byExercise[s.exercise_id].push(s);
  });
  const exerciseIds = Object.keys(byExercise).sort(
    (a, b) => (byExercise[a][0]?.position ?? 0) - (byExercise[b][0]?.position ?? 0)
  );

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />

      <div className="px-5 pt-2 pb-3 flex items-center justify-between">
        <Link
          href="/history"
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-neutral-100"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </Link>
        <button
          onClick={() => setShowMenu(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-neutral-100 text-neutral-500"
        >
          <MoreHorizontal size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className="px-7 pb-4">
        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-1">
          {formatDate(workout.started_at)}
        </p>
        <h1 className="font-display text-[32px] leading-tight font-light text-black">
          {workout.routine_name ?? "Entrenamiento"}
        </h1>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
          <span>{formatDuration(workout.duration_seconds)}</span>
          <span className="text-neutral-300">·</span>
          <span className="tabular-nums">{workout.completed_sets} series completadas</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-7 pb-12">
        {exerciseIds.map((exId) => {
          const meta = getExercise(exId);
          const exSets = byExercise[exId];
          return (
            <div key={exId} className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                {meta && (
                  <div className="w-10 h-12 flex items-center justify-center flex-shrink-0">
                    <AnatomyModel primary={meta.primary} secondary={meta.secondary} view="front" size={28} />
                  </div>
                )}
                <p className="text-[14px] font-medium text-black">{meta?.name ?? exId}</p>
              </div>

              <div className="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 px-1 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">Set</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">kg</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">Reps</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-center">✓</span>
              </div>

              {exSets.map((s, idx) => (
                <div
                  key={s.id}
                  className={`grid grid-cols-[28px_1fr_1fr_1fr] gap-2 items-center mb-1 py-1 rounded-lg ${
                    s.done ? "bg-neutral-100" : ""
                  }`}
                >
                  <span className="text-[12px] tabular-nums text-neutral-500 text-center">{idx + 1}</span>
                  <span className="text-[13px] tabular-nums text-black text-center">
                    {s.weight != null ? s.weight : "—"}
                  </span>
                  <span className="text-[13px] tabular-nums text-black text-center">
                    {s.reps != null ? s.reps : "—"}
                  </span>
                  <span className="text-[12px] text-center">{s.done ? "✓" : "—"}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Delete menu bottom sheet */}
      {showMenu && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setShowMenu(false)}>
          <div className="absolute inset-0 bg-black/40 anim-fade-in" />
          <div
            className="relative w-full bg-white rounded-t-[28px] px-7 pt-3 pb-10 anim-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-4" />
            <button
              onClick={() => {
                setShowMenu(false);
                handleDelete();
              }}
              disabled={deleting}
              className="w-full text-left py-3 text-[15px] text-red-600 disabled:opacity-40"
            >
              {deleting ? "Eliminando…" : "Eliminar entrenamiento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
