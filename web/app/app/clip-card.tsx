"use client";

import { useState } from "react";

export type Clip = {
  id: string;
  idx: number;
  hook: string | null;
  description: string | null;
  virality_score: number | null;
  duration_s: number;
  url: string | null;
  created_at: string;
};

export function ClipCard({ clip }: { clip: Clip }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!clip.description) return;
    try {
      await navigator.clipboard.writeText(clip.description);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard bloqueado */
    }
  }

  return (
    <div className="clip-card box">
      <div className="clip-card-top">
        <span className="clip-num">{String(clip.idx).padStart(2, "0")}</span>
        {clip.virality_score != null && (
          <span className="clip-viral">🔥 {Math.round(clip.virality_score)}</span>
        )}
        <span className="clip-dur">{Math.round(clip.duration_s)}s</span>
      </div>

      {clip.url ? (
        // previa "viva": toca em loop, sem som (igual galeria de clipes)
        <video
          className="clip-video"
          src={clip.url}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="clip-video clip-novideo" />
      )}

      {clip.hook && <div className="clip-hook">{clip.hook}</div>}

      {clip.description && (
        <div className="clip-desc">
          <p>{clip.description}</p>
          <button className="copy-btn" onClick={copy}>
            {copied ? "COPIADO ✓" : "COPIAR LEGENDA"}
          </button>
        </div>
      )}

      {clip.url && (
        <a className="clip-dl" href={clip.url} download={`clip_${clip.idx}.mp4`}>
          ↧ BAIXAR
        </a>
      )}
    </div>
  );
}
