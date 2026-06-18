"use client";

// SPIKE de viabilidade (ferramenta de dev, fora do produto): mede se o navegador
// aguenta processar um gameplay grande LOCALMENTE — o coracao do "proxy 2 fases".
// Roda em /spike. Escolha um arquivo real e veja os numeros.

import { useRef, useState } from "react";

type Line = { t: string; kind?: "ok" | "err" | "info" };

export default function SpikePage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const add = (t: string, kind?: Line["kind"]) => setLines((l) => [...l, { t, kind }]);

  function seek(v: HTMLVideoElement, t: number): Promise<void> {
    return new Promise((res) => {
      const done = () => {
        v.removeEventListener("seeked", done);
        res();
      };
      v.addEventListener("seeked", done);
      v.currentTime = t;
    });
  }

  async function run(file: File) {
    setBusy(true);
    setLines([]);
    add(`Arquivo: ${file.name} — ${(file.size / 1e9).toFixed(2)} GB (${file.type || "tipo?"})`);

    const url = URL.createObjectURL(file);
    const v = videoRef.current!;
    v.src = url;
    try {
      await new Promise<void>((res, rej) => {
        v.onloadedmetadata = () => res();
        v.onerror = () => rej(new Error("o navegador NAO abriu esse vídeo (codec H.265/HEVC? formato?)"));
        setTimeout(() => rej(new Error("timeout carregando metadados")), 20000);
      });
    } catch (e) {
      add((e as Error).message, "err");
      add("→ Achado importante: esse arquivo não roda nativo no navegador. Precisaríamos de WebCodecs/transcode ou outro caminho.", "info");
      setBusy(false);
      URL.revokeObjectURL(url);
      return;
    }

    const dur = v.duration;
    const W = v.videoWidth;
    const H = v.videoHeight;
    add(`Duração: ${dur.toFixed(1)}s · Resolução: ${W}x${H}`, "ok");

    // canvas pequeno (320px) — exatamente o que o motion usa
    const cw = 320;
    const ch = Math.max(1, Math.round((320 * H) / W));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    const fps = 4; // mesma taxa do motion no motor
    const target = Math.min(Math.floor(dur * fps), 4000); // cap pro spike
    add(`Varrendo ~${target} frames a ${fps} fps (downscale 320px)…`);

    const t0 = performance.now();
    let prev: Uint8ClampedArray | null = null;
    const motion: number[] = [];
    for (let i = 0; i < target; i++) {
      const t = (i + 0.5) / fps;
      if (t >= dur) break;
      await seek(v, t);
      ctx.drawImage(v, 0, 0, cw, ch);
      const data = ctx.getImageData(0, 0, cw, ch).data;
      if (prev) {
        let s = 0;
        for (let p = 0; p < data.length; p += 4) s += Math.abs(data[p] - prev[p]);
        motion.push(s / (data.length / 4));
      }
      prev = data;
      if (i > 0 && i % 40 === 0) {
        const el = (performance.now() - t0) / 1000;
        add(`…${i}/${target} (${(i / el).toFixed(1)} frames/s)`, "info");
      }
    }
    const el = (performance.now() - t0) / 1000;
    const rate = (motion.length + 1) / el;
    add(`✅ ${motion.length + 1} frames em ${el.toFixed(1)}s → ${rate.toFixed(1)} frames/s`, "ok");
    add(`Projeção: vídeo de 10 min @4fps (2400 frames) ≈ ${(2400 / rate).toFixed(0)}s de varredura`, "ok");
    if (motion.length) {
      const mx = Math.max(...motion);
      add(`Motion calculado no navegador ✓ (pico relativo ${(mx).toFixed(1)} — dá pra montar o track aqui)`, "ok");
    }
    add("Próximo a medir: extrair o áudio (Whisper) e recortar trechos. Mas o long pole é esse acima.", "info");

    URL.revokeObjectURL(url);
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 820, margin: "40px auto", padding: 24, fontFamily: "monospace", color: "#eee", background: "#0a0a0d", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 18 }}>SPIKE · proxy no navegador</h1>
      <p style={{ color: "#9aa0a6", fontSize: 13 }}>
        Escolha um gameplay real (de preferência o de 3GB+). Tudo roda local no seu Chrome — nada sobe.
        Me mande os números do resultado.
      </p>
      <input
        type="file"
        accept="video/*"
        disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); }}
        style={{ margin: "12px 0" }}
      />
      <video ref={videoRef} muted playsInline style={{ display: "none" }} />
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
