"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

// ---- Time range config ----
type RangeKey = "1m" | "3m" | "all";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "1m", label: "1 mes", days: 30 },
  { key: "3m", label: "3 meses", days: 90 },
  { key: "all", label: "Todo", days: null },
];

const DAY_MS = 86400000;

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function fmt(v: number, unit: string) {
  const n = Number.isInteger(v) ? v : Math.round(v * 10) / 10;
  return unit ? `${n} ${unit}` : `${n}`;
}

// Lunes de la semana de una fecha (YYYY-MM-DD) para agrupar por semana.
function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7; // 0 = Lunes
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// ---- Exercise progression card ----
function ExerciseCard({
  exerciseId,
  allPoints,
  points,
  metric,
}: {
  exerciseId: string;
  allPoints: ProgressPoint[];
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

  // Récord personal (peso máx histórico, con sus reps) — de TODO el historial
  const pr = allPoints.reduce(
    (best, p) => (p.maxWeight > best.w ? { w: p.maxWeight, r: p.bestReps } : best),
    { w: 0, r: 0 }
  );

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 mb-2.5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-11 flex items-center justify-center flex-shrink-0">
          <AnatomyModel primary={meta.primary} secondary={meta.secondary} view="front" size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-black leading-tight">{meta.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-neutral-400">{meta.equipment}</span>
            {pr.w > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-black bg-neutral-100 rounded-full px-1.5 py-0.5 tabular-nums">
                <Trophy size={10} strokeWidth={2} />
                PR {fmt(pr.w, "kg")}
                {pr.r > 0 ? ` × ${pr.r}` : ""}
              </span>
            )}
          </div>
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
          {hasData
            ? "Necesitas otro entrenamiento en este rango para ver la tendencia."
            : "Aún sin registros en este rango."}
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
  const [rangeKey, setRangeKey] = useState<RangeKey>("all");

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
  const range = RANGES.find((r) => r.key === rangeKey)!;

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

  // Filtro temporal
  const inRange = useMemo(() => {
    const cutoff = range.days ? Date.now() - range.days * DAY_MS : 0;
    return (iso: string) => new Date(iso).getTime() >= cutoff;
  }, [range]);

  // Resumen: volumen semanal + sesiones + volumen total (en rango)
  const summary = useMemo(() => {
    const volumeByWeek: Record<string, number> = {};
    const sessions = new Set<string>();
    let totalVolume = 0;
    for (const id of exerciseIds) {
      for (const p of progress[id] ?? []) {
        if (!inRange(p.date)) continue;
        sessions.add(p.date);
        totalVolume += p.volume;
        const wk = weekStart(p.date);
        volumeByWeek[wk] = (volumeByWeek[wk] ?? 0) + p.volume;
      }
    }
    const weekly = Object.entries(volumeByWeek)
      .map(([week, vol]) => ({ week, label: shortDate(week), value: Math.round(vol) }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
    return { weekly, sessions: sessions.size, totalVolume: Math.round(totalVolume) };
  }, [exerciseIds, progress, inRange]);

  const anyData = summary.sessions > 0;

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
          <div className="scroll-area overflow-x-auto px-7 pb-2 flex-shrink-0">
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

          {/* Time range control */}
          <div className="px-7 pb-3 flex-shrink-0 flex gap-2">
            {RANGES.map((r) => {
              const active = r.key === rangeKey;
              return (
                <button
                  key={r.key}
                  onClick={() => setRangeKey(r.key)}
                  className={`text-[11px] px-3 py-1.5 rounded-full transition ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-500 active:bg-neutral-200"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto scroll-area px-7 pb-28">
            {!anyData ? (
              <div className="border border-dashed border-neutral-300 rounded-2xl py-10 px-6 text-center">
                <p className="text-[13px] text-neutral-600 leading-relaxed">
                  No hay entrenamientos de esta rutina en este rango.
                </p>
              </div>
            ) : (
              <>
                {/* Weekly volume summary */}
                <div className="bg-neutral-900 text-white rounded-2xl p-4 mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Volumen total</p>
                      <p className="font-display text-[26px] leading-none tabular-nums mt-1">
                        {summary.totalVolume.toLocaleString("es-ES")} kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Sesiones</p>
                      <p className="font-display text-[26px] leading-none tabular-nums mt-1">
                        {summary.sessions}
                      </p>
                    </div>
                  </div>
                  {summary.weekly.length >= 2 && (
                    <div className="-mx-1">
                      <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1 px-1">
                        Volumen por semana
                      </p>
                      <ResponsiveContainer width="100%" height={80}>
                        <BarChart data={summary.weekly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 9, fill: "#ffffff80" }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={12}
                          />
                          <Tooltip
                            cursor={{ fill: "#ffffff14" }}
                            contentStyle={{
                              background: "#171717",
                              border: "1px solid #404040",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "#a3a3a3" }}
                            formatter={(v: any) => [`${Number(v).toLocaleString("es-ES")} kg`, "Volumen"]}
                          />
                          <Bar dataKey="value" fill="#ffffff" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Metric segmented control */}
                <div className="flex bg-neutral-100 rounded-xl p-1 mb-3">
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

                {/* Exercise cards */}
                {exerciseIds.map((id) => (
                  <ExerciseCard
                    key={id}
                    exerciseId={id}
                    allPoints={progress[id] ?? []}
                    points={(progress[id] ?? []).filter((p) => inRange(p.date))}
                    metric={metric}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
