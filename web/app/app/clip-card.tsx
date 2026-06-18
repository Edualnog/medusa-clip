"use client";

import { useRef, useState } from "react";
import { Icon } from "./icons";

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

  // Preview no hover SEM atrapalhar o controle manual: o auto play/pause so age
  // enquanto o video estiver MUDO (modo preview). Se o usuario tirar o mudo ou der
  // play pelos controles, ele "engajou" e a gente nao mexe mais ao sair o mouse.
  function onEnter() {
    const v = videoRef.current;
    if (v && v.paused && v.muted) v.play().catch(() => {});
  }
  function onLeave() {
    const v = videoRef.current;
    if (v && v.muted) {
      v.pause();
      try {
        v.currentTime = 0.5;
      } catch {
        /* ignora */
      }
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
      {clip.url ? (
        <div className="clip-video-wrap" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <video
            ref={videoRef}
            className="clip-video"
            src={`${clip.url}#t=0.5`}
            muted
            loop
            playsInline
            controls
            controlsList="nodownload noplaybackrate"
            preload="metadata"
          />
          <div className="clip-badges" aria-hidden>
            <span className="clip-num">{String(clip.idx).padStart(2, "0")}</span>
            <span className="clip-badge-spacer" />
            {clip.virality_score != null && (
              <span className="clip-viral">
                <Icon name="spark" size={11} /> {Math.round(clip.virality_score)}
              </span>
            )}
            <span className="clip-dur">{Math.round(clip.duration_s)}s</span>
          </div>
        </div>
      ) : (
        <div className="clip-video-wrap clip-novideo">processando…</div>
      )}

      <div className="clip-body">
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
            <Icon name="film" size={14} /> BAIXAR
          </a>
        )}
      </div>
    </div>
  );
}
