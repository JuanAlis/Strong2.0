"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AuthScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      alert(error.message);
      setLoading(false);
    }
    // On success the browser navigates to Google — loading stays true intentionally
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="h-11 flex-shrink-0" />

      <div className="px-7 pt-2 pb-8">
        <p className="text-[11px] tracking-[0.2em] text-neutral-400 mb-2">BIENVENIDO a</p>
        <h1 className="font-display text-[44px] leading-[0.95] font-light text-black tracking-tight">
          Entrenar<span className="italic">.</span>
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-7 pb-16">
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center gap-3 bg-white border border-black rounded-2xl px-5 py-4 text-[14px] font-medium text-black active:scale-[0.99] transition disabled:opacity-40"
          >
            <GoogleIcon />
            <span className="flex-1 text-center">
              {loading ? "Redirigiendo…" : "Continuar con Google"}
            </span>
          </button>

          <p className="text-center text-xs text-neutral-400">
            Solo se necesita tu correo para identificarte
          </p>
        </div>
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
