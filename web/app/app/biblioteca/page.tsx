"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipCard, type Clip } from "../clip-card";
import { Icon } from "../icons";
import { createClient } from "@/lib/supabase/client";

export default function BibliotecaPage() {
  const [clips, setClips] = useState<Clip[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/clips");
      const d = r.ok ? await r.json() : { clips: [] };
      setClips(d.clips ?? []);
    } catch {
      setClips([]);
    }
  }, []);

  useEffect(() => {
    load();

    // Realtime: novos clipes do worker entram aqui sem precisar dar refresh.
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      channel = supabase
        .channel("biblioteca")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "clips", filter: `user_id=eq.${uid}` },
          () => load(),
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <div>
      <div className="painel-head">
        <div>
          <h1 className="painel-title">BIBLIOTECA</h1>
          <p className="painel-sub">Todos os seus clipes gerados — preview, legenda e download.</p>
        </div>
        {clips && (
          <div className="painel-badge">
            <Icon name="film" size={14} /> {clips.length} CLIPS
          </div>
        )}
      </div>

      {clips === null ? (
        <div className="empty">Carregando…</div>
      ) : clips.length === 0 ? (
        <div className="empty">
          Sua biblioteca está vazia — gere o primeiro corte na aba <b>Início</b>.
        </div>
      ) : (
        <div className="clip-grid">
          {clips.map((c) => (
            <ClipCard key={c.id} clip={c} />
          ))}
        </div>
      )}
    </div>
  );
}
