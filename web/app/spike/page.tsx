"use client";

// SPIKE de viabilidade (dev tool, fora do produto): mede se o navegador aguenta
// processar um gameplay grande LOCALMENTE — o coracao do "proxy 2 fases".
// /spike — escolha o arquivo, clique ANALISAR, e me mande os numeros.

import { useRef, useState } from "react";

type Line = { t: string; kind?: "ok" | "err" | "info" };

export default function SpikePage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const add = (t: string, kind?: Line["kind"]) => {
    // eslint-disable-next-line no-console
    console.log("[spike]", t);
    setLines((l) => [...l, { t, kind }]);
  };

  function seek(v: HTMLVideoElement, t: number): Promise<void> {
    return new Promise((res, rej) => {
      const ok = () => { cleanup(); res(); };
      const err = () => { cleanup(); rej(new Error("erro ao buscar frame")); };
      const cleanup = () => { v.removeEventListener("seeked", ok); v.removeEventListener("error", err); };
      v.addEventListener("seeked", ok);
      v.addEventListener("error", err);
      v.currentTime = t;
    });
  }

  async function run() {
    if (!file || busy) return;
    setBusy(true);
    setLines([]);
    add(`Arquivo: ${file.name}`);
    add(`Tamanho: ${(file.size / 1e9).toFixed(2)} GB · tipo: ${file.type || "(desconhecido)"}`);

    const v = videoRef.current!;
    const url = URL.createObjectURL(file);
    v.src = url;
    v.load();

    try {
      add("Carregando metadados do vídeo…", "info");
      await new Promise<void>((res, rej) => {
        const ok = () => { clearTimeout(to); res(); };
        const bad = () => { clearTimeout(to); rej(new Error("o navegador NÃO decodifica esse vídeo (provável H.265/HEVC)")); };
        const to = setTimeout(() => rej(new Error("timeout (20s) carregando metadados")), 20000);
        v.onloadedmetadata = ok;
        v.onerror = bad;
        if (v.readyState >= 1) ok();
      });
    } catch (e) {
      add((e as Error).message, "err");
      add("→ Achado: esse arquivo não roda nativo no Chrome. Caminho exigiria WebCodecs/transcode. Tente um MP4 H.264 pra comparar.", "info");
      URL.revokeObjectURL(url);
      setBusy(false);
      return;
    }

    const dur = v.duration;
    const W = v.videoWidth;
    const H = v.videoHeight;
    add(`Duração: ${(dur / 60).toFixed(1)} min (${dur.toFixed(0)}s) · ${W}x${H}`, "ok");

    const cw = 320;
    const ch = Math.max(1, Math.round((320 * H) / W));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    const fps = 4;
    const target = Math.min(Math.floor(dur * fps), 1200); // cap: ~5 min de scan no spike
    add(`Varrendo ${target} frames a ${fps} fps (downscale 320px)…`, "info");

    const t0 = performance.now();
    let prev: Uint8ClampedArray | null = null;
    let processed = 0;
    let blank = 0;
    try {
      for (let i = 0; i < target; i++) {
        const t = (i + 0.5) / fps;
        if (t >= dur) break;
        await seek(v, t);
        ctx.drawImage(v, 0, 0, cw, ch);
        const data = ctx.getImageData(0, 0, cw, ch).data;
        let sum = 0;
        if (prev) { for (let p = 0; p < data.length; p += 4) sum += Math.abs(data[p] - prev[p]); }
        if (data[0] === 0 && data[4] === 0 && data[8] === 0) blank++;
        prev = data;
        processed++;
        if (i > 0 && i % 30 === 0) {
          const el = (performance.now() - t0) / 1000;
          add(`…${i}/${target} · ${(i / el).toFixed(1)} frames/s`, "info");
        }
      }
    } catch (e) {
      add(`parou na varredura: ${(e as Error).message}`, "err");
    }

    const el = (performance.now() - t0) / 1000;
    const rate = processed / Math.max(0.001, el);
    add(`✅ ${processed} frames em ${el.toFixed(1)}s → ${rate.toFixed(1)} frames/s`, "ok");
    add(`Projeção: vídeo de ${(dur / 60).toFixed(0)} min @4fps ≈ ${(dur * fps / rate).toFixed(0)}s de varredura`, "ok");
    if (blank > processed * 0.5) {
      add(`⚠ ${blank}/${processed} frames vieram PRETOS — o navegador não está rasterizando esse vídeo no canvas (DRM/codec).`, "err");
    } else {
      add(`Frames lidos OK (${blank} pretos) — dá pra calcular o motion no navegador ✓`, "ok");
    }

    URL.revokeObjectURL(url);
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 820, margin: "40px auto", padding: 24, fontFamily: "monospace", color: "#eee", background: "#0a0a0d", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 18 }}>SPIKE · proxy no navegador</h1>
      <p style={{ color: "#9aa0a6", fontSize: 13 }}>
        Escolha um gameplay real, clique ANALISAR. Tudo roda local no Chrome — nada sobe.
        Abra o Console (F12) se quiser ver o log cru. Me mande os números.
      </p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0" }}>
        <input
          type="file"
          accept="video/*"
          disabled={busy}
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setLines([]); }}
        />
        <button
          onClick={run}
          disabled={!file || busy}
          style={{ padding: "8px 18px", background: file && !busy ? "#ffd11a" : "#333", color: file && !busy ? "#000" : "#888", border: "none", cursor: file && !busy ? "pointer" : "default", fontFamily: "monospace", fontWeight: "bold" }}
        >
          {busy ? "ANALISANDO…" : "ANALISAR"}
        </button>
      </div>
      {/* video offscreen (NAO display:none — alguns Chrome nao decodificam escondido) */}
      <video ref={videoRef} muted playsInline preload="auto" style={{ position: "fixed", left: -9999, top: 0, width: 2, height: 2, opacity: 0 }} />
      <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.6 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.kind === "err" ? "#ff6b6b" : l.kind === "ok" ? "#ffd11a" : l.kind === "info" ? "#9aa0a6" : "#eee" }}>
            {l.t}
          </div>
        ))}
        {busy && <div style={{ color: "#9aa0a6" }}>…rodando (não feche a aba)…</div>}
      </div>
    </div>
  );
}
