import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSSRClient, type CookieOptions } from "@supabase/ssr";

// For server components with no auth requirement (ISR pages, public data).
// Uses the anon key over HTTPS via PostgREST — no pooler config needed for the JS client.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// For auth-aware server components and route handlers (cookies required).
export function createAuthServerClient(cookieStore: {
  get: (name: string) => { value: string } | undefined;
  set: (args: { name: string; value: string } & CookieOptions) => void;
}) {
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
