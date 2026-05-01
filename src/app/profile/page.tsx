"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  listBodyWeight,
  addBodyWeight,
  deleteBodyWeight,
  listBodyMeasurements,
  addBodyMeasurement,
  deleteBodyMeasurement,
  getUserProfile,
  upsertUserProfile,
  type BodyWeightEntry,
  type BodyMeasurementEntry,
  type UserProfile,
  type GoalType,
  type SexType,
} from "@/lib/db";
import BottomNav from "@/components/BottomNav";
import { X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const GOAL_LABELS: Record<GoalType, string> = {
  cut: "Perder grasa",
  maintain: "Mantener",
  bulk: "Ganar músculo",
};

// ---------- PERSONAL DATA CARD ----------
function PersonalDataCard({ user }: { user: User }) {
  const [profile, setProfile] = useState<UserProfile>({
    sex: null,
    height_cm: null,
    birth_date: null,
    goal: null,
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    getUserProfile(user.id).then((p) => {
      if (p) setProfile(p);
    });
  }, [user.id]);

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertUserProfile(user.id, profile);
      setDirty(false);
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  return (
    <section>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-black mb-4">
        Datos personales
      </h2>

      <div className="space-y-3">
        {/* Email read-only */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">Email</label>
          <p className="text-[13px] text-neutral-500 bg-neutral-50 rounded-xl px-3 py-2.5">
            {user.email}
          </p>
        </div>

        {/* Sex */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">Sexo</label>
          <div className="flex rounded-xl overflow-hidden border border-neutral-200">
            {(["M", "F"] as SexType[]).map((s) => (
              <button
                key={s}
                onClick={() => set("sex", profile.sex === s ? null : s)}
                className={`flex-1 py-2.5 text-[13px] font-medium transition ${
                  profile.sex === s ? "bg-black text-white" : "bg-white text-neutral-500"
                }`}
              >
                {s === "M" ? "Hombre" : "Mujer"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Height */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">
              Altura (cm)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={profile.height_cm ?? ""}
              onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : null)}
              placeholder="175"
              className="w-full bg-neutral-100 rounded-xl px-3 py-2.5 text-[13px] tabular-nums text-center text-black outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
            />
          </div>

          {/* Birth date */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={profile.birth_date ?? ""}
              onChange={(e) => set("birth_date", e.target.value || null)}
              className="w-full bg-neutral-100 rounded-xl px-3 py-2.5 text-[12px] text-black outline-none focus:bg-neutral-200/70 transition"
            />
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">Objetivo</label>
          <div className="space-y-1.5">
            {(Object.entries(GOAL_LABELS) as [GoalType, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => set("goal", profile.goal === key ? null : key)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition ${
                  profile.goal === key ? "bg-black text-white" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-black text-white rounded-2xl py-3.5 text-[14px] font-medium active:scale-[0.99] transition disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        )}
      </div>
    </section>
  );
}

// ---------- AJUSTES CARD ----------
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
        enabled ? "bg-black" : "bg-neutral-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
          enabled ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function AjustesCard({ user }: { user: User }) {
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getUserProfile(user.id).then((p) => {
      if (p) {
        setSound(p.sound_enabled ?? true);
        setVibration(p.vibration_enabled ?? true);
      }
      setLoaded(true);
    });
  }, [user.id]);

  const save = (sound_enabled: boolean, vibration_enabled: boolean) => {
    getUserProfile(user.id)
      .then((p) =>
        upsertUserProfile(user.id, {
          ...(p ?? { sex: null, height_cm: null, birth_date: null, goal: null }),
          sound_enabled,
          vibration_enabled,
        })
      )
      .catch(() => {});
  };

  if (!loaded) return null;

  return (
    <section>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-black mb-4">
        Ajustes
      </h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-1">
          <span className="text-[13px] text-neutral-700">Sonido al terminar descanso</span>
          <Toggle
            enabled={sound}
            onChange={(v) => {
              setSound(v);
              save(v, vibration);
            }}
          />
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[13px] text-neutral-700">Vibración al terminar descanso</span>
          <Toggle
            enabled={vibration}
            onChange={(v) => {
              setVibration(v);
              save(sound, v);
            }}
          />
        </div>
      </div>
    </section>
  );
}

// ---------- BODY WEIGHT SECTION ----------
function BodyWeightSection({ user }: { user: User }) {
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [newWeightDate, setNewWeightDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listBodyWeight(user.id).then(setWeights).catch(console.error);
  }, [user.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;
    setSaving(true);
    try {
      await addBodyWeight(user.id, newWeightDate, Number(newWeight));
      setWeights(await listBodyWeight(user.id));
      setNewWeight("");
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
  if (!confirm("¿Eliminar este registro?")) return;
  await deleteBodyWeight(id);
  setWeights(await listBodyWeight(user.id));
  };

  const chartData = weights
    .slice(0, 10)
    .reverse()
    .map((w) => ({
      date: new Date(w.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      kg: w.weight_kg,
    }));

  return (
    <section>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-black mb-4">
        Peso corporal
      </h2>

      {chartData.length > 1 && (
        <div className="mb-4 -mx-2">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v} kg`, "Peso"]}
              />
              <Line type="monotone" dataKey="kg" stroke="#171717" strokeWidth={1.5} dot={{ r: 3, fill: "#171717" }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="date"
          value={newWeightDate}
          onChange={(e) => setNewWeightDate(e.target.value)}
          className="flex-1 bg-neutral-100 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:bg-neutral-200/70 transition"
        />
        <input
          type="number"
          inputMode="decimal"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          placeholder="kg"
          className="w-20 bg-neutral-100 rounded-xl px-3 py-2.5 text-[13px] text-center tabular-nums outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
        />
        <button
          type="submit"
          disabled={saving || !newWeight}
          className="bg-black text-white px-4 rounded-xl text-[13px] font-medium disabled:opacity-40"
        >
          +
        </button>
      </form>

      {weights.length > 0 && (
        <div className="space-y-0">
          <div className="grid grid-cols-[1fr_80px] gap-2 px-1 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Fecha</span>
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 text-right">kg</span>
          </div>
          {weights.map((w) => (
                <div key={w.id} className="grid grid-cols-[1fr_80px_32px] gap-2 py-2 border-b border-neutral-100 items-center">
                <span className="text-[13px] text-neutral-600">
                  {new Date(w.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="text-[13px] font-medium text-black text-right tabular-nums">{w.weight_kg} kg</span>
                <button onClick={() => handleDelete(w.id)} className="text-neutral-300 active:text-red-400 transition flex items-center justify-center">
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- MEASUREMENTS SECTION ----------
function MeasurementsSection({ user }: { user: User }) {
  const [measurements, setMeasurements] = useState<BodyMeasurementEntry[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    chest: "", arm_right: "", arm_left: "", waist: "", hips: "", thigh_right: "", thigh_left: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listBodyMeasurements(user.id).then(setMeasurements).catch(console.error);
  }, [user.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addBodyMeasurement(user.id, {
        date: form.date,
        chest: form.chest ? Number(form.chest) : null,
        arm_right: form.arm_right ? Number(form.arm_right) : null,
        arm_left: form.arm_left ? Number(form.arm_left) : null,
        waist: form.waist ? Number(form.waist) : null,
        hips: form.hips ? Number(form.hips) : null,
        thigh_right: form.thigh_right ? Number(form.thigh_right) : null,
        thigh_left: form.thigh_left ? Number(form.thigh_left) : null,
      });
      setMeasurements(await listBodyMeasurements(user.id));
      setForm((f) => ({ ...f, chest: "", arm_right: "", arm_left: "", waist: "", hips: "", thigh_right: "", thigh_left: "" }));
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta medición?")) return;
    await deleteBodyMeasurement(id);
    setMeasurements(await listBodyMeasurements(user.id));
    };



  const mField = (key: keyof typeof form, label: string) =>
    key === "date" ? null : (
      <div key={key} className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</label>
        <input
          type="number"
          inputMode="decimal"
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder="cm"
          className="w-full bg-neutral-100 rounded-lg py-2 px-3 text-[13px] tabular-nums text-black outline-none focus:bg-neutral-200/70 transition placeholder:text-neutral-300"
        />
      </div>
    );

  return (
    <section>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-black mb-4">
        Medidas corporales
      </h2>

      <form onSubmit={handleAdd} className="space-y-3 mb-6">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1 block">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full bg-neutral-100 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:bg-neutral-200/70 transition"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mField("chest", "Pecho")}
          {mField("waist", "Cintura")}
          {mField("hips", "Cadera")}
          {mField("arm_right", "Brazo (D)")}
          {mField("arm_left", "Brazo (I)")}
          {mField("thigh_right", "Muslo (D)")}
          {mField("thigh_left", "Muslo (I)")}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white rounded-2xl py-3.5 text-[14px] font-medium active:scale-[0.99] transition disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Guardar medidas"}
        </button>
      </form>

      {measurements.length > 0 && (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-[11px] border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-neutral-200">
                {["Fecha", "Pecho", "B.D", "B.I", "Cintura", "Cadera", "M.D", "M.I"].map((h) => (
                  <th key={h} className="py-1.5 px-1 text-left font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                  
                ))}
                <th className="py-1.5 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-b border-neutral-100">
                  <td className="py-2 px-1 text-neutral-600 whitespace-nowrap">
                    {new Date(m.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </td>
                  {[m.chest, m.arm_right, m.arm_left, m.waist, m.hips, m.thigh_right, m.thigh_left].map((v, i) => (
                    <td key={i} className="py-2 px-1 tabular-nums text-black text-center">
                      {v != null ? v : <span className="text-neutral-300">—</span>}
                    </td>
                  ))} 
                  <td className="py-2 px-1">
              <button onClick={() => handleDelete(m.id)} className="text-neutral-300 active:text-red-400 transition">
                <X size={13} strokeWidth={1.5} />
              </button>
            </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------- PAGE ----------
export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-[13px] text-neutral-300">•••</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />
      <div className="px-7 pt-2 pb-5">
        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Cuenta</p>
        <h1 className="font-display text-[44px] leading-[0.95] font-light text-black tracking-tight">
          Perfil<span className="italic">.</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-7 pb-28 space-y-8">
        <PersonalDataCard user={user} />
        <AjustesCard user={user} />
        <BodyWeightSection user={user} />
        <MeasurementsSection user={user} />

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
          className="text-[12px] text-neutral-400 underline"
        >
          Cerrar sesión
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
