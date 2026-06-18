import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs"; // crypto precisa do runtime Node

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Status da chave (NUNCA devolve o valor; so se existe + 4 ultimos digitos).
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_api_keys")
    .select("key_last4, provider, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    hasKey: !!data,
    last4: data?.key_last4 ?? null,
    provider: data?.provider ?? "openrouter",
    updatedAt: data?.updated_at ?? null,
  });
}

// Salva/atualiza a chave (cifrada). Valida formato e (best-effort) na OpenRouter.
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { key } = await req.json().catch(() => ({ key: undefined }));
  if (typeof key !== "string" || !key.startsWith("sk-or-") || key.length < 20) {
    return NextResponse.json(
      { error: "Chave invalida — use uma chave da OpenRouter (sk-or-...)." },
      { status: 400 },
    );
  }

  // valida na OpenRouter sem bloquear por instabilidade de rede
  try {
    const r = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (r.status === 401 || r.status === 403) {
      return NextResponse.json({ error: "A OpenRouter rejeitou essa chave." }, { status: 400 });
    }
  } catch {
    /* rede instavel: segue e salva */
  }

  const admin = createAdminClient();
  const { error } = await admin.from("user_api_keys").upsert({
    user_id: user.id,
    provider: "openrouter",
    key_cipher: encrypt(key),
    key_last4: key.slice(-4),
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, last4: key.slice(-4) });
}

// Remove a chave.
export async function DELETE() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from("user_api_keys").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
