"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClipCard, type Clip } from "./clip-card";

type Job = {
  id: string;
  source_url: string;
  status: string;
  progress: number;
  stage: string | null;
  error: string | null;
};

type Stats = { clipsTotal: number; jobsDone: number; costUsd: number; totalTokens: number };

const LAYOUTS: Record<string, string> = {
  facecam_top_gameplay_bottom: "Facecam em cima + gameplay",
  dynamic_gameplay: "Gameplay (segue a ação)",
  gameplay_blur: "Tela cheia + fundo desfocado",
  gameplay_only: "Crop central",
};
const DUR: Record<string, [number, number, string]> = {
  auto: [15, 90, "Auto (15–90s) — variado"],
  curto: [10, 40, "Curtos (10–40s)"],
  longo: [60, 180, "Longos (60–180s)"],
};
const FACECAM: Record<string, string> = {
  auto: "Auto-detectar (rosto)",
  tr: "Topo direita",
  tl: "Topo esquerda",
  br: "Baixo direita",
  bl: "Baixo esquerda",
};

export default function PainelPage() {
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clipsById, setClipsById] = useState<Map<string, Clip>>(new Map());
  const [stats, setStats] = useState<Stats>({ clipsTotal: 0, jobsDone: 0, costUsd: 0, totalTokens: 0 });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const hadActive = useRef(false);
  // opcoes de estilo do corte
  const [layout, setLayout] = useState("facecam_top_gameplay_bottom");
  const [durPreset, setDurPreset] = useState("auto");
  const [maxClips, setMaxClips] = useState(6);
  const [captions, setCaptions] = useState(true);
  const [facecamCorner, setFacecamCorner] = useState("auto");

  const loadClips = useCallback(async () => {
    const r = await fetch("/api/clips");
    if (!r.ok) return;
    const d = await r.json();
    setStats(d.stats);
    setClipsById((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const c of d.clips as Clip[]) {
        if (!next.has(c.id)) {
          next.set(c.id, c);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const loadJobs = useCallback(async () => {
    const r = await fetch("/api/jobs");
    if (!r.ok) return;
    const list: Job[] = (await r.json()).jobs;
    setJobs(list);
    const active = list.some((j) => j.status === "queued" || j.status === "processing");
    if (hadActive.current && !active) loadClips();
    hadActive.current = active;
  }, [loadClips]);

  useEffect(() => {
    loadClips();
    loadJobs();
    const t = setInterval(loadJobs, 4000);
    return () => clearInterval(t);
  }, [loadClips, loadJobs]);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    const [min_len, max_len] = DUR[durPreset];
    const options = {
      layout,
      captions,
      max_clips: maxClips,
      min_len,
      max_len,
      facecam_auto: facecamCorner === "auto",
      facecam_corner: facecamCorner === "auto" ? null : facecamCorner,
      score_virality: true,
    };
    const r = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, options }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      setMsg({ kind: "ok", text: "Job criado! Está na fila — começa já." });
      setUrl("");
      await loadJobs();
    } else {
      setMsg({ kind: "err", text: data.error ?? "Falhou ao criar o job." });
    }
    setCreating(false);
  }

  const recent = [...clipsById.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);
  const active = jobs.find((j) => j.status === "queued" || j.status === "processing");
  const failed = jobs.find((j) => j.status === "error");

  return (
    <div>
      <div className="painel-head">
        <div>
          <h1 className="painel-title">PAINEL DE CLIPS</h1>
          <p className="painel-sub">Gere os melhores momentos dos seus gameplays.</p>
        </div>
        <div className="painel-badge">🎬 {stats.clipsTotal} CLIPS</div>
      </div>

      <form onSubmit={gerar} className="box gen-box">
        <label className="input">
          <span aria-hidden>🔗</span>
          <input
            placeholder="Cole o link do seu vídeo de gameplay aqui..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button className="btn" type="submit" disabled={creating || url.trim().length < 8}>
          {creating ? "..." : "GERAR CLIPS →"}
        </button>
      </form>
      <p className="gen-hint">ⓘ Suporta YouTube, TikTok e muito mais — processa na nuvem com a sua chave.</p>

      <div className="box opts-box">
        <div className="opts-row">
          <label className="opt">
            <span>ESTILO / LAYOUT</span>
            <select value={layout} onChange={(e) => setLayout(e.target.value)}>
              {Object.entries(LAYOUTS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="opt">
            <span>DURAÇÃO</span>
            <select value={durPreset} onChange={(e) => setDurPreset(e.target.value)}>
              {Object.entries(DUR).map(([v, d]) => (
                <option key={v} value={v}>{d[2]}</option>
              ))}
            </select>
          </label>
          {layout === "facecam_top_gameplay_bottom" && (
            <label className="opt">
              <span>FACECAM</span>
              <select value={facecamCorner} onChange={(e) => setFacecamCorner(e.target.value)}>
                {Object.entries(FACECAM).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          )}
          <label className="opt">
            <span>Nº DE CORTES: {maxClips}</span>
            <input type="range" min={1} max={10} value={maxClips} onChange={(e) => setMaxClips(Number(e.target.value))} />
          </label>
          <label className="opt opt-check">
            <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} />
            <span>Legenda karaokê</span>
          </label>
        </div>
      </div>

      {msg && <p className={msg.kind === "ok" ? "dash-note" : "msg"}>{msg.text}</p>}

      {active && (
        <div className="box job-active">
          <div className="job-active-top">
            <span>{active.status === "queued" ? "NA FILA" : "PROCESSANDO"}</span>
            <span>{Math.round(active.progress * 100)}%</span>
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${Math.max(2, active.progress * 100)}%` }} />
          </div>
          <div className="job-stage">{active.stage ?? "Aguardando o worker pegar o job…"}</div>
        </div>
      )}
      {failed && !active && <div className="box job-failed">⚠ Último job falhou: {failed.error}</div>}

      <div className="box stats-bar">
        <div className="stat">
          <span className="stat-label">VÍDEOS ANALISADOS</span>
          <span className="stat-val">{stats.jobsDone}</span>
        </div>
        <div className="stat">
          <span className="stat-label">TOTAL DE CLIPS</span>
          <span className="stat-val">{stats.clipsTotal}</span>
        </div>
        <div className="stat">
          <span className="stat-label">💸 GASTO DE IA (SUA CHAVE)</span>
          <span className="stat-val">${stats.costUsd.toFixed(4)}</span>
          <span className="stat-sub">{stats.totalTokens.toLocaleString("pt-BR")} tokens</span>
        </div>
      </div>

      {recent.length > 0 && (
        <>
          <div className="painel-section recent-head">
            <div className="badge">ÚLTIMOS CLIPES</div>
            <Link href="/app/biblioteca" className="nav-link recent-all">VER TUDO →</Link>
          </div>
          <div className="clip-grid">
            {recent.map((c) => (
              <ClipCard key={c.id} clip={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
