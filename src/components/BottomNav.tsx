"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Calendar, User, Calculator } from "lucide-react";

const tabs = [
  { href: "/profile", icon: User, label: "Perfil" },
  { href: "/history", icon: Calendar, label: "Historial" },
  { href: "/", icon: Dumbbell, label: "Entrenar" },
  { href: "/calculator", icon: Calculator, label: "Calc." },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2 : 1.5}
                className={active ? "text-black" : "text-neutral-400"}
              />
              <span
                className={`text-[10px] ${
                  active ? "text-black font-semibold" : "text-neutral-400 font-medium"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
