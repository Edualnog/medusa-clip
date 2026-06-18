import { createClient } from "@supabase/supabase-js";

// Client ADMIN (service_role) — SO no servidor. Ignora RLS, entao nunca pode
// vazar pro navegador. Usado pelas rotas /api/* que ja checaram a sessao do user.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente (adicione no .env.local do servidor)");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
