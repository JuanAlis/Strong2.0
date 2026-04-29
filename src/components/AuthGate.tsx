"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) alert(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />
      <div className="px-7 pt-2 pb-8">
        <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Bienvenido</p>
        <h1 className="font-display text-[44px] leading-[0.95] font-light text-black tracking-tight">
          Entrenar<span className="italic">.</span>
        </h1>
      </div>

      <div className="flex-1 flex flex-col justify-center px-7 pb-16">
        {sent ? (
          <div className="text-center">
            <p className="font-display text-[22px] font-light mb-3">Revisa tu email</p>
            <p className="text-[13px] text-neutral-500 leading-relaxed">
              Te enviamos un enlace a<br />
              <span className="text-black font-medium">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <p className="text-[13px] text-neutral-500 leading-relaxed mb-6">
              Inicia sesión para acceder a tus entrenamientos y medidas.
            </p>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-neutral-100 rounded-xl px-4 py-3 text-[14px] outline-none focus:bg-neutral-200/70 transition"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-black text-white rounded-2xl py-4 text-[14px] font-medium active:scale-[0.99] transition disabled:opacity-40"
            >
              {loading ? "Enviando…" : "Enviar enlace mágico"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-[13px] text-neutral-300">•••</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return <>{children}</>;
}
