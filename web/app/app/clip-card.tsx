"use client";

import { useRef, useState } from "react";

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
  const videoRef = useRef<HTMLVideoElement>(null);

  function onEnter() {
    const v = videoRef.current;
    if (v) v.play().catch(() => {});
  }
  function onLeave() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    try {
      v.currentTime = 0.5; // volta pro frame de previa
    } catch {
      /* ignora */
    }
  }

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
        // mostra um frame de previa (#t=0.5) e TOCA ao passar o mouse
        <div className="clip-video-wrap" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <video
            ref={videoRef}
            className="clip-video"
            src={`${clip.url}#t=0.5`}
            muted
            loop
            playsInline
            preload="metadata"
          />
          <span className="clip-play">▶</span>
        </div>
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
