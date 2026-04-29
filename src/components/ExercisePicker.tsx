"use client";

import { useMemo, useState } from "react";
import { Search, X, Check } from "lucide-react";
import { EXERCISES, GROUPS, EQUIPMENT_LIST } from "@/data/exercises";
import AnatomyModel from "./AnatomyModel";

interface Props {
  alreadyAdded?: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

export default function ExercisePicker({ alreadyAdded = [], onClose, onConfirm }: Props) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string>("Todos");
  const [equipment, setEquipment] = useState<string>("Todo");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(
    () =>
      EXERCISES.filter((e) => {
        if (alreadyAdded.includes(e.id)) return false;
        if (group !== "Todos" && e.group !== group) return false;
        if (equipment !== "Todo" && e.equipment !== equipment) return false;
        if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [search, group, equipment, alreadyAdded]
  );

  const groupedByLetter = useMemo(() => {
    const g: Record<string, typeof EXERCISES> = {};
    filtered.forEach((e) => {
      const letter = e.name[0].toUpperCase();
      if (!g[letter]) g[letter] = [];
      g[letter].push(e);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <div className="fixed inset-0 z-30 bg-white flex flex-col anim-fade-in">
      <div className="h-11 flex-shrink-0" />
      <div className="px-5 pt-2 pb-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-neutral-100"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
        <p className="text-[14px] font-medium">Añadir ejercicios</p>
        <button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
          className="text-[14px] font-medium text-black disabled:text-neutral-300"
        >
          Añadir{selected.length > 0 ? ` (${selected.length})` : ""}
        </button>
      </div>

      <div className="px-5 pb-3">
        <div className="bg-neutral-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <Search size={15} strokeWidth={1.8} className="text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicio"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-neutral-400"
          />
        </div>
      </div>

      <div className="px-5 pb-2 flex gap-1.5 overflow-x-auto scroll-area">
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
              group === g ? "bg-black text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto scroll-area">
        {EQUIPMENT_LIST.map((eq) => (
          <button
            key={eq}
            onClick={() => setEquipment(eq)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
              equipment === eq
                ? "bg-neutral-800 text-white"
                : "bg-white border border-neutral-200 text-neutral-500"
            }`}
          >
            {eq}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-5 pb-32">
        {groupedByLetter.length === 0 && (
          <p className="text-center text-[13px] text-neutral-400 mt-12">Sin resultados</p>
        )}
        {groupedByLetter.map(([letter, items]) => (
          <div key={letter}>
            <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mt-4 mb-1 px-1">
              {letter}
            </p>
            {items.map((ex) => {
              const isSel = selected.includes(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => toggle(ex.id)}
                  className={`w-full flex items-center gap-3 py-2 active:bg-neutral-50 rounded-lg px-1 transition ${
                    isSel ? "bg-neutral-50" : ""
                  }`}
                >
                  <div className="w-10 h-12 flex items-center justify-center flex-shrink-0">
                    <AnatomyModel primary={ex.primary} secondary={ex.secondary} view="front" size={28} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-medium text-black leading-tight truncate">
                      {ex.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {ex.group} · {ex.equipment}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                      isSel ? "bg-black" : "border border-neutral-300"
                    }`}
                  >
                    {isSel && <Check size={13} strokeWidth={3} className="text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent">
          <button
            onClick={() => onConfirm(selected)}
            className="w-full bg-black text-white rounded-2xl py-4 text-[15px] font-medium active:scale-[0.98] transition"
          >
            Añadir {selected.length} {selected.length === 1 ? "ejercicio" : "ejercicios"}
          </button>
        </div>
      )}
    </div>
  );
}
