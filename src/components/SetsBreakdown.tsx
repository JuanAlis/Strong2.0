import type { GroupCount } from "@/lib/db";

// Desglose de series por grupo muscular. `dark` invierte colores para tarjetas oscuras.
export default function SetsBreakdown({
  total,
  groups,
  dark = false,
}: {
  total: number;
  groups: GroupCount[];
  dark?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-[10px] uppercase tracking-wider ${
            dark ? "text-white/50" : "text-neutral-400"
          }`}
        >
          Series totales
        </span>
        <span
          className={`text-[13px] font-semibold tabular-nums ${
            dark ? "text-white" : "text-black"
          }`}
        >
          {total}
        </span>
      </div>
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {groups.map((g) => (
            <span
              key={g.group}
              className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 tabular-nums ${
                dark ? "bg-white/10 text-white/70" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {g.group}
              <span className={`font-semibold ${dark ? "text-white" : "text-black"}`}>
                {g.count}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
