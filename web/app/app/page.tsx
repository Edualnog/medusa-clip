"use client";

import { useCallback, useEffect, useState } from "react";

type Job = {
  id: string;
  source_url: string;
  status: string;
  progress: number;
  stage: string | null;
  error: string | null;
};

type Clip = {
  id: string;
  idx: number;
  hook: string | null;
  virality_score: number | null;
  duration_s: number;
  url: string | null;
};

export default function PainelPage() {
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [stats, setStats] = useState({ clipsTotal: 0, jobsDone: 0 });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [jr, cr] = await Promise.all([fetch("/api/jobs"), fetch("/api/clips")]);
    if (jr.ok) setJobs((await jr.json()).jobs);
    if (cr.ok) {
      const d = await cr.json();
      setClips(d.clips);
      setStats(d.stats);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    const r = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      setMsg({ kind: "ok", text: "Job criado! Está na fila — o processamento começa já." });
      setUrl("");
      await load();
    } else {
      setMsg({ kind: "err", text: data.error ?? "Falhou ao criar o job." });
    }
    setCreating(false);
  }

  const active = jobs.find((j) => j.status === "queued" || j.status === "processing");
  const failed = jobs.find((j) => j.status === "error");

  return (
    <div>
      {/* header */}
      <div className="painel-head">
        <div>
          <h1 className="painel-title">PAINEL DE CLIPS</h1>
          <p className="painel-sub">Gere e gerencie os melhores momentos dos seus gameplays.</p>
        </div>
        <div className="painel-badge">🎬 {stats.clipsTotal} CLIPS</div>
      </div>

      {/* gerar */}
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
      {msg && <p className={msg.kind === "ok" ? "dash-note" : "msg"}>{msg.text}</p>}

      {/* job ativo */}
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
      {failed && !active && (
        <div className="box job-failed">⚠ Último job falhou: {failed.error}</div>
      )}

      {/* clips */}
      <div className="painel-section">
        <div className="badge">CLIPS GERADOS ({clips.length})</div>
      </div>
      {clips.length === 0 ? (
        <div className="empty">Nenhum clip ainda — cole um link e gere. 🎮</div>
      ) : (
        <div className="clip-grid">
          {clips.map((c) => (
            <div className="clip-card box" key={c.id}>
              <div className="clip-card-top">
                <span className="clip-num">{String(c.idx).padStart(2, "0")}</span>
                <span className="clip-dur">{Math.round(c.duration_s)}s</span>
              </div>
              {c.url ? (
                <video className="clip-video" src={c.url} controls preload="metadata" />
              ) : (
                <div className="clip-video clip-novideo" />
              )}
              <div className="clip-hook">{c.hook || "Clip"}</div>
              {c.virality_score != null && (
                <div className="vbar">
                  <div className="vbar-fill" style={{ width: `${c.virality_score}%` }} />
                  <span>🔥 {Math.round(c.virality_score)}</span>
                </div>
              )}
              {c.url && (
                <a className="clip-dl" href={c.url} download={`clip_${c.idx}.mp4`}>
                  ↧ BAIXAR
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* stats */}
      <div className="box stats-bar">
        <div className="stat">
          <span className="stat-label">VÍDEOS ANALISADOS</span>
          <span className="stat-val">{stats.jobsDone}</span>
        </div>
        <div className="stat">
          <span className="stat-label">TOTAL DE CLIPS</span>
          <span className="stat-val">{stats.clipsTotal}</span>
        </div>
      </div>
    </div>
  );
}
