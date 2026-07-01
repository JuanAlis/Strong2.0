"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  listRoutines,
  getProgress,
  type Routine,
  type ProgressPoint,
} from "@/lib/db";
import { getExercise } from "@/data/exercises";
import AnatomyModel from "@/components/AnatomyModel";
import BottomNav from "@/components/BottomNav";

// ---- Metric config ----
type MetricKey = "maxWeight" | "maxReps" | "volume";

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "maxWeight", label: "Peso máx", unit: "kg" },
  { key: "maxReps", label: "Reps máx", unit: "" },
  { key: "volume", label: "Volumen", unit: "kg" },
];

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function fmt(v: number, unit: string) {
  const n = Number.isInteger(v) ? v : Math.round(v * 10) / 10;
  return unit ? `${n} ${unit}` : `${n}`;
}

// ---- Exercise progression card ----
function ExerciseCard({
  exerciseId,
  points,
  metric,
}: {
  exerciseId: string;
  points: ProgressPoint[];
  metric: { key: MetricKey; label: string; unit: string };
}) {
  const meta = getExercise(exerciseId);
  if (!meta) return null;

  const series = points.map((p) => ({ date: shortDate(p.date), value: p[metric.key] }));
  const hasData = series.length > 0;
  const enough = series.length >= 2;

  const first = hasData ? series[0].value : 0;
  const last = hasData ? series[series.length - 1].value : 0;
  const delta = last - first;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 mb-2.5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-11 flex items-center justify-center flex-shrink-0">
          <AnatomyModel primary={meta.primary} secondary={meta.secondary} view="front" size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-black leading-tight">{meta.name}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">{meta.equipment}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-display text-[22px] leading-none text-black tabular-nums">
            {hasData ? fmt(last, metric.unit) : "—"}
          </p>
          {enough && (
            <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-neutral-500 tabular-nums">
              <DeltaIcon size={12} strokeWidth={2} />
              <span>
                {delta > 0 ? "+" : ""}
                {fmt(delta, metric.unit)}
              </span>
            </div>
          )}
        </div>
      </div>

      {enough ? (
        <div className="mt-3 -mx-1">
          <ResponsiveContainer width="100%" height={96}>
            <LineChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#a3a3a3" }}
                axisLine={false}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 9, fill: "#a3a3a3" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any) => [fmt(Number(v), metric.unit), metric.label]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#171717"
                strokeWidth={1.5}
                dot={{ r: 2.5, fill: "#171717" }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-neutral-400">
          {hasData ? "Necesitas otro entrenamiento para ver la tendencia." : "Aún sin registros."}
        </p>
      )}
    </div>
  );
}

// ---- Page ----
export default function ProgressPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metricKey, setMetricKey] = useState<MetricKey>("maxWeight");

  useEffect(() => {
    Promise.all([listRoutines(), getProgress()])
      .then(([rs, prog]) => {
        setRoutines(rs);
        setProgress(prog);
        if (rs.length > 0) setSelectedId(rs[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = routines.find((r) => r.id === selectedId) ?? null;
  const metric = METRICS.find((m) => m.key === metricKey)!;

  // Ejercicios únicos de la rutina, en orden
  const exerciseIds = useMemo(() => {
    if (!selected) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const ex of selected.exercises) {
      if (!seen.has(ex.exercise_id)) {
        seen.add(ex.exercise_id);
        ids.push(ex.exercise_id);
      }
    }
    return ids;
  }, [selected]);

  const anyData = exerciseIds.some((id) => (progress[id]?.length ?? 0) > 0);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />

      <div className="px-7 pt-2 pb-4">
        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Análisis</p>
        <h1 className="font-display text-[44px] leading-[0.95] font-light text-black tracking-tight">
          Progreso<span className="italic">.</span>
        </h1>
      </div>

      {loading ? (
        <p className="text-[13px] text-neutral-400 text-center mt-12">Cargando…</p>
      ) : routines.length === 0 ? (
        <div className="px-7">
          <div className="border border-dashed border-neutral-300 rounded-2xl py-12 px-6 text-center">
            <p className="text-[13px] text-neutral-600 leading-relaxed mb-4">
              Crea una rutina y entrénala para ver tu progresión.
            </p>
            <Link
              href="/routine/new"
              className="inline-block bg-black text-white rounded-xl px-5 py-2.5 text-[13px] font-medium active:scale-95 transition"
            >
              Nueva rutina
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Routine selector */}
          <div className="scroll-area overflow-x-auto px-7 pb-3 flex-shrink-0">
            <div className="flex gap-2 w-max">
              {routines.map((r) => {
                const active = r.id === selectedId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition ${
                      active
                        ? "bg-black text-white font-medium"
                        : "bg-neutral-100 text-neutral-500 active:bg-neutral-200"
                    }`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metric segmented control */}
          <div className="px-7 pb-3 flex-shrink-0">
            <div className="flex bg-neutral-100 rounded-xl p-1">
              {METRICS.map((m) => {
                const active = m.key === metricKey;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMetricKey(m.key)}
                    className={`flex-1 py-2 rounded-lg text-[12px] transition ${
                      active ? "bg-white text-black font-medium shadow-sm" : "text-neutral-500"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto scroll-area px-7 pb-28">
            {!anyData && (
              <div className="border border-dashed border-neutral-300 rounded-2xl py-10 px-6 text-center mb-2.5">
                <p className="text-[13px] text-neutral-600 leading-relaxed">
                  Todavía no hay entrenamientos registrados para esta rutina.
                </p>
              </div>
            )}
            {exerciseIds.map((id) => (
              <ExerciseCard
                key={id}
                exerciseId={id}
                points={progress[id] ?? []}
                metric={metric}
              />
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
