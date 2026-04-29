"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/db";
import BottomNav from "@/components/BottomNav";

const ACTIVITY_LEVELS = [
  { label: "Sedentario (sin ejercicio)", factor: 1.2 },
  { label: "Ligero (1-3 días/semana)", factor: 1.375 },
  { label: "Moderado (3-5 días/semana)", factor: 1.55 },
  { label: "Activo (6-7 días/semana)", factor: 1.725 },
  { label: "Muy activo (2 veces/día)", factor: 1.9 },
];

function mifflinBMR(weight: number, height: number, age: number, sex: "M" | "F"): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === "M" ? base + 5 : base - 161;
}

function ageFromBirthDate(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function CalculatorPage() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [activityIdx, setActivityIdx] = useState(1);

  // Auto-fill from user profile on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      getUserProfile(user.id).then((profile) => {
        if (!profile) return;
        if (profile.height_cm != null) setHeight(String(profile.height_cm));
        if (profile.sex) setSex(profile.sex);
        if (profile.birth_date) setAge(String(ageFromBirthDate(profile.birth_date)));
      });
    });
  }, []);

  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age, 10);
  const valid = w > 0 && h > 0 && a > 0;

  const bmr = valid ? Math.round(mifflinBMR(w, h, a, sex)) : null;
  const factor = ACTIVITY_LEVELS[activityIdx].factor;
  const tdee = bmr ? Math.round(bmr * factor) : null;

  const resultRow = (label: string, kcal: number | null, sub?: string) => (
    <div className="flex items-baseline justify-between py-3 border-b border-neutral-100 last:border-0">
      <div>
        <p className="text-[14px] font-medium text-black">{label}</p>
        {sub && <p className="text-[11px] text-neutral-400 mt-0.5">{sub}</p>}
      </div>
      <p className="font-display text-[22px] font-light tabular-nums text-black">
        {kcal != null ? kcal.toLocaleString("es-ES") : "—"}
        {kcal != null && <span className="text-[14px] text-neutral-400 ml-1">kcal</span>}
      </p>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />

      <div className="px-7 pt-2 pb-5">
        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Herramienta</p>
        <h1 className="font-display text-[44px] leading-[0.95] font-light text-black tracking-tight">
          Calculadora<span className="italic">.</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-7 pb-28 space-y-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">Peso (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                className="w-full bg-neutral-100 rounded-xl px-3 py-2.5 text-[14px] tabular-nums text-center text-black outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">Altura (cm)</label>
              <input
                type="number"
                inputMode="decimal"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
                className="w-full bg-neutral-100 rounded-xl px-3 py-2.5 text-[14px] tabular-nums text-center text-black outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">Edad</label>
              <input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                className="w-full bg-neutral-100 rounded-xl px-3 py-2.5 text-[14px] tabular-nums text-center text-black outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">Sexo</label>
              <div className="flex rounded-xl overflow-hidden border border-neutral-200">
                {(["M", "F"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSex(s)}
                    className={`flex-1 py-2.5 text-[14px] font-medium transition ${
                      sex === s ? "bg-black text-white" : "bg-white text-neutral-500"
                    }`}
                  >
                    {s === "M" ? "Hombre" : "Mujer"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">
              Nivel de actividad
            </label>
            <div className="space-y-1.5">
              {ACTIVITY_LEVELS.map((al, i) => (
                <button
                  key={i}
                  onClick={() => setActivityIdx(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition ${
                    activityIdx === i ? "bg-black text-white" : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {al.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-neutral-200/80 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-2">
            Resultados · Mifflin-St Jeor
          </p>
          {resultRow("BMR", bmr, "Metabolismo basal en reposo")}
          {resultRow("TDEE", tdee, "Gasto total con actividad")}
          {resultRow("Déficit −300", tdee ? tdee - 300 : null, "Pérdida de peso suave")}
          {resultRow("Déficit −500", tdee ? tdee - 500 : null, "Pérdida de peso moderada")}
          {resultRow("Superávit +300", tdee ? tdee + 300 : null, "Ganancia muscular")}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
