"use client";

import { useEffect, useState } from "react";
import { ClipCard, type Clip } from "../clip-card";

export default function BibliotecaPage() {
  const [clips, setClips] = useState<Clip[] | null>(null);

  useEffect(() => {
    fetch("/api/clips")
      .then((r) => (r.ok ? r.json() : { clips: [] }))
      .then((d) => setClips(d.clips ?? []))
      .catch(() => setClips([]));
  }, []);

  return (
    <div>
      <div className="painel-head">
        <div>
          <h1 className="painel-title">BIBLIOTECA</h1>
          <p className="painel-sub">Todos os seus clipes gerados — preview, legenda e download.</p>
        </div>
        {clips && <div className="painel-badge">🎬 {clips.length} CLIPS</div>}
      </div>

      {clips === null ? (
        <div className="empty">Carregando…</div>
      ) : clips.length === 0 ? (
        <div className="empty">
          Sua biblioteca está vazia — gere o primeiro corte na aba <b>Gerar</b>. 🎮
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
