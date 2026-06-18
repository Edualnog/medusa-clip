import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Lista os clipes do usuario (com link assinado pra preview/download) + stats.
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: clips } = await admin
    .from("clips")
    .select("id, job_id, idx, hook, reason, virality_score, duration_s, storage_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  const rows = clips ?? [];
  let signedByPath = new Map<string, string>();
  if (rows.length) {
    const { data: signed } = await admin.storage
      .from("clips")
      .createSignedUrls(rows.map((c) => c.storage_path), 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
    }
  }

  const out = rows.map((c) => ({
    id: c.id,
    idx: c.idx,
    hook: c.hook,
    reason: c.reason,
    virality_score: c.virality_score,
    duration_s: c.duration_s,
    created_at: c.created_at,
    url: signedByPath.get(c.storage_path) ?? null,
  }));

  const { count: clipsTotal } = await admin
    .from("clips")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  const { count: jobsDone } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "done");

  return NextResponse.json({
    clips: out,
    stats: { clipsTotal: clipsTotal ?? 0, jobsDone: jobsDone ?? 0 },
  });
}
