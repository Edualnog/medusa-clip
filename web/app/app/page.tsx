"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClipCard, type Clip } from "./clip-card";
import { Icon } from "./icons";
import { createClient } from "@/lib/supabase/client";

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
  auto: [15, 90, "Auto (15–90s)"],
  curto: [10, 40, "Curtos (10–40s)"],
  longo: [60, 180, "Longos (60–180s)"],
};
const FACECAM: Record<string, string> = {
  auto: "Auto (rosto)",
  tr: "Topo direita",
  tl: "Topo esquerda",
  br: "Baixo direita",
  bl: "Baixo esquerda",
};
// PUT do arquivo direto no R2, com progresso (XHR — fetch nao reporta upload).
function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onPct: (p: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onPct(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha no upload (HTTP ${xhr.status}).`));
    xhr.onerror = () => reject(new Error("Erro de rede no upload."));
    xhr.send(file);
  });
}

// Traduz o erro cru (yt-dlp/pipeline) num recado claro + o que o usuario deve fazer.
function friendlyError(raw: string | null): { title: string; hint?: string } {
  const e = (raw || "").toLowerCase();
  if (e.includes("not a bot") || e.includes("confirm you") || e.includes("sign in to confirm"))
    return { title: "O YouTube bloqueou o download (IP de servidor).", hint: "Use SUBIR ARQUIVO, ou um link do Google Drive / Dropbox / .mp4 direto." };
  if (e.includes("requested format") || e.includes("storyboard"))
    return { title: "O YouTube não liberou esse vídeo pra download.", hint: "Use SUBIR ARQUIVO ou um link do Drive/Dropbox." };
  if (e.includes("googledrive") || e.includes("drive.google"))
    return { title: "Não consegui acessar esse arquivo do Google Drive.", hint: "No Drive: Compartilhar → Acesso geral → “Qualquer pessoa com o link” (leitor). Depois cole o link de novo." };
  if (e.includes("dropbox"))
    return { title: "Não consegui baixar esse link do Dropbox.", hint: "Confira se o link é público (compartilhável) e tente de novo." };
  if (e.includes("sem chave") || e.includes("api conectada") || e.includes("openrouter"))
    return { title: "Conecte sua chave da OpenRouter primeiro.", hint: "Vá na aba CHAVES API e salve a sua chave." };
  if (e.includes("metadados") || e.includes("nao encontrado") || e.includes("invalid"))
    return { title: "O vídeo parece inválido ou corrompido.", hint: "Tente outro arquivo — MP4 (H.264) é o mais compatível." };
  if (e.includes("yt-dlp") || e.includes("download") || e.includes("http error") || e.includes("403"))
    return { title: "Não consegui baixar esse link.", hint: "Confira se é público e tente de novo — ou use SUBIR ARQUIVO." };
  return { title: "Algo deu errado ao processar o vídeo.", hint: "Tente de novo, ou use outro arquivo/link. Se persistir, me avise." };
}

export default function PainelPage() {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clipsById, setClipsById] = useState<Map<string, Clip>>(new Map());
  const [stats, setStats] = useState<Stats>({ clipsTotal: 0, jobsDone: 0, costUsd: 0, totalTokens: 0 });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const hadActive = useRef(false);
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

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Realtime: o worker escreve progresso/stage no job e insere os clips ->
    // a UI reage na hora (sem polling). RLS garante que so vem o do proprio user.
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      channel = supabase
        .channel("painel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jobs", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = payload.new as Job;
            if (!row?.id) return;
            setJobs((prev) => {
              const i = prev.findIndex((j) => j.id === row.id);
              if (i === -1) return [row, ...prev];
              const next = [...prev];
              next[i] = { ...next[i], ...row };
              return next;
            });
            if (row.status === "done" || row.status === "error") loadClips();
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "clips", filter: `user_id=eq.${uid}` },
          () => loadClips(),
        )
        .subscribe();
    });

    // rede de seguranca: se o realtime cair, ainda reconcilia de vez em quando.
    const t = setInterval(loadJobs, 20000);
    return () => {
      clearInterval(t);
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadClips, loadJobs]);

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

  async function criarJob(body: object, okMsg: string) {
    const r = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error ?? "Falhou ao criar o job.");
    setMsg({ kind: "ok", text: okMsg });
    await loadJobs();
  }

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setMsg(null);
    try {
      if (mode === "link") {
        // worker baixa o link no servidor (Drive/Dropbox/.mp4 direto — sem bloqueio)
        if (url.trim().length < 8) throw new Error("Cole um link válido.");
        await criarJob({ url: url.trim(), options }, "Link na fila — o servidor vai baixar e cortar.");
        setUrl("");
      } else {
        if (!file) throw new Error("Escolha um vídeo.");
        const ct = file.type || "video/mp4";
        // 1. URL assinada de upload (valida formato/tamanho + BYO key)
        const up = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: ct, size: file.size }),
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error ?? "Falha ao preparar o upload.");
        // 2. sobe direto pro R2 (com progresso)
        await putWithProgress(upData.uploadUrl, file, ct, setUploadPct);
        // 3. cria o job
        await criarJob({ upload_key: upData.key, options }, "Vídeo enviado! Está na fila — começa já.");
        setFile(null);
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Erro inesperado." });
    } finally {
      setUploadPct(null);
      setCreating(false);
    }
  }

  const recent = [...clipsById.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6);
  const active = jobs.find((j) => j.status === "queued" || j.status === "processing");
  const failed = jobs.find((j) => j.status === "error");
  const perClip = stats.clipsTotal > 0 ? stats.costUsd / stats.clipsTotal : 0;

  return (
    <div className="painel2">
      {/* top bar */}
      <div className="top2">
        <span className="top2-title">INICIO</span>
        <div className="top2-right">
          <span className="top2-chip" title="Total de clipes gerados">
            <Icon name="film" size={15} /> {stats.clipsTotal} clipes
          </span>
        </div>
      </div>

      {/* hero: gerar */}
      <form onSubmit={gerar} className="gen2 box">
        <div className="gen2-tabs">
          <button type="button" className={`gen2-tab${mode === "upload" ? " active" : ""}`} onClick={() => setMode("upload")}>
            SUBIR ARQUIVO
          </button>
          <button type="button" className={`gen2-tab${mode === "link" ? " active" : ""}`} onClick={() => setMode("link")}>
            COLAR LINK
          </button>
        </div>

        <div className="gen2-bar">
          {mode === "upload" ? (
            <label key="upload" className="gen2-input gen2-file">
              <span aria-hidden><Icon name="film" size={20} /></span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className={file ? "gen2-filename" : "gen2-filename gen2-placeholder"}>
                {file ? file.name : "Escolha o vídeo do seu gameplay (MP4/MOV)…"}
              </span>
            </label>
          ) : (
            <label key="link" className="gen2-input">
              <span aria-hidden><Icon name="link" size={20} /></span>
              <input
                type="text"
                placeholder="Cole o link do Google Drive, Dropbox ou .mp4 direto…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
          )}
          <button
            className="gen2-btn"
            type="submit"
            disabled={creating || (mode === "upload" ? !file : url.trim().length < 8)}
          >
            {creating ? (uploadPct != null ? `${uploadPct}%` : "...") : "✦ GERAR"}
          </button>
        </div>

        <div className="opts-row gen2-opts">
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

        <p className="gen2-hint">
          {mode === "upload"
            ? "ⓘ Suba o gameplay (MP4/MOV até 5 GB) — processa na nuvem com a sua chave."
            : "ⓘ Cole um link do Drive/Dropbox/.mp4 — o servidor baixa direto (mais rápido que subir)."}
        </p>
      </form>
      {msg && <p className={msg.kind === "ok" ? "dash-note" : "msg"} style={{ textAlign: "center" }}>{msg.text}</p>}

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
        <div className="box job-failed">
          <div className="job-failed-title">⚠ {friendlyError(failed.error).title}</div>
          {friendlyError(failed.error).hint && (
            <div className="job-failed-hint">{friendlyError(failed.error).hint}</div>
          )}
        </div>
      )}

      {/* clipes */}
      <div className="painel-section recent-head">
        <div className="badge">SEUS CLIPES ({stats.clipsTotal})</div>
        <Link href="/app/biblioteca" className="nav-link recent-all">VER TUDO →</Link>
      </div>
      {recent.length === 0 ? (
        <div className="empty">Nenhum clip ainda — cole um link e gere.</div>
      ) : (
        <div className="clip-grid">
          {recent.map((c) => (
            <ClipCard key={c.id} clip={c} />
          ))}
        </div>
      )}

      {/* custo de IA — o diferencial: você paga só a IA, na sua chave, sem markup */}
      <div className="box cost-card">
        <div className="cost-head">
          <Icon name="coin" size={14} />
          <span>CUSTO DE IA · SUA CHAVE OPENROUTER</span>
        </div>
        <div className="cost-metrics">
          <div className="cost-metric">
            <span className="cost-val">${stats.costUsd.toFixed(4)}</span>
            <span className="cost-label">TOTAL GASTO</span>
          </div>
          <div className="cost-metric cost-hero">
            <span className="cost-val">${perClip.toFixed(4)}</span>
            <span className="cost-label">MEDIA / CORTE</span>
          </div>
          <div className="cost-metric">
            <span className="cost-val">{stats.totalTokens.toLocaleString("pt-BR")}</span>
            <span className="cost-label">TOKENS</span>
          </div>
        </div>
        <p className="cost-note">
          ⓘ Você paga só a IA, direto na sua chave — sem markup nosso.
        </p>
      </div>
    </div>
  );
}
