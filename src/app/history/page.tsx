"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { listWorkouts, type WorkoutSummary } from "@/lib/db";
import BottomNav from "@/components/BottomNav";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listWorkouts()
      .then(setWorkouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />

      <div className="px-7 pt-2 pb-5">
        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Registro</p>
        <h1 className="font-display text-[44px] leading-[0.95] font-light text-black tracking-tight">
          Historial<span className="italic">.</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-7 pb-28">
        {loading ? (
          <p className="text-[13px] text-neutral-400 text-center mt-12">Cargando…</p>
        ) : workouts.length === 0 ? (
          <div className="border border-dashed border-neutral-300 rounded-2xl py-12 px-6 text-center">
            <p className="text-[13px] text-neutral-600 leading-relaxed">
              Todavía no hay entrenamientos registrados.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <Link
                key={w.id}
                href={`/history/${w.id}`}
                className="block w-full bg-white border border-neutral-200/80 rounded-2xl p-4 active:bg-neutral-50 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-display text-[18px] leading-tight text-black">
                    {w.routine_name ?? "Entrenamiento"}
                  </p>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-neutral-300 mt-0.5" />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
                  <span>{formatDate(w.started_at)}</span>
                  <span className="text-neutral-300">·</span>
                  <span>{formatDuration(w.duration_seconds)}</span>
                  <span className="text-neutral-300">·</span>
                  <span className="tabular-nums">{w.completed_sets} series completadas</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
