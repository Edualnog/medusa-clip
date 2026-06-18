import { createBrowserClient } from "@supabase/ssr";

// Client do Supabase pro navegador (usa a anon key publica).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
