// Landing 8-bit do Medusa Clip. Estatica por enquanto — auth + app vem nas
// proximas fases. O design segue a referencia pixel/gamer.
import { Fragment } from "react";
import Link from "next/link";
import { MedusaLogo } from "./medusa-logo";

const STEPS = [
  { icon: "gamepad", title: "1. ENVIE O GAMEPLAY", text: "Suba o vídeo ou cole um link público" },
  { icon: "ai", title: "2. IA ANALISA", text: "A Medusa Clip acha os momentos com mais ação" },
  { icon: "swords", title: "3. CORTES PRONTOS", text: "Gera clipes 9:16 com gancho, legenda e reframe" },
  { icon: "trophy", title: "4. POSTE ONDE QUISER", text: "Baixe e publique no TikTok, Reels ou Shorts" },
];

const DEMO_CLIPS = [
  { hook: "TRIPLE KILL!", tc: "00:01 - 00:15", scene: "arena" },
  { hook: "VICTORY!", tc: "00:15 - 00:32", scene: "castle" },
  { hook: "PENTA KILL!", tc: "00:32 - 00:48", scene: "boss" },
  { hook: "WTF?!", tc: "00:48 - 01:02", scene: "race" },
  { hook: "EPIC WIN!", tc: "01:02 - 01:18", scene: "peak" },
];

const FEATURES = [
  {
    icon: "▣",
    title: "FEITO PRA GAMEPLAY",
    text: "Cortadores genéricos dependem demais da fala. A Medusa Clip procura ação, pico de áudio, troca de cena, reação, kill, clutch e fail.",
  },
  {
    icon: "◎",
    title: "A IA VÊ A TELA",
    text: "O juiz é multimodal: olha frames do corte, não só a legenda. Gameplay é visual, então a IA precisa ver o que aconteceu.",
  },
  {
    icon: "✦",
    title: "SEM CRÉDITOS INFLADOS",
    text: "Você usa sua própria chave de IA e paga o custo real direto na OpenRouter. A assinatura é só da ferramenta.",
  },
];

const USAGE = [
  { n: "1", title: "CRIE SUA CONTA", text: "Cadastro rápido, sem cartão pra testar." },
  { n: "2", title: "CONECTE SUA CHAVE", text: "Cole sua chave da OpenRouter (fica segura, criptografada). Você paga só o uso real da IA." },
  { n: "3", title: "ENVIE E GERE", text: "Suba um arquivo ou cole um link. A Medusa Clip processa na nuvem e entrega os cortes." },
];

const FAQ = [
  {
    q: "Por que a Medusa Clip é diferente?",
    a: "Porque é focada em gameplay: acha kill, clutch, fail e reação por sinais de áudio e cena, e a IA vê a tela.",
  },
  {
    q: "Preciso instalar algo?",
    a: "Não. Roda na nuvem, direto no navegador. Você só conecta sua chave e envia o vídeo.",
  },
  {
    q: "Por que usar minha própria chave?",
    a: "Você paga o custo real da IA (centavos por vídeo), sem créditos inflados. Mais transparente e previsível.",
  },
  {
    q: "Funciona com qualquer jogo?",
    a: "Sim. Áudio + cena funcionam pra qualquer gameplay, de FPS a simulador.",
  },
];

function Icon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  switch (name) {
    case "gamepad":
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" {...p}>
          <rect x="2" y="7" width="20" height="10" />
          <path d="M6 10v4M4 12h4M15 11h.01M18 13h.01" />
        </svg>
      );
    case "ai":
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" {...p}>
          <rect x="3" y="8" width="18" height="9" />
          <path d="M8 4l1 3M16 4l-1 3M12 11l1 2-2 0 1 2" />
        </svg>
      );
    case "swords":
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" {...p}>
          <path d="M4 4l9 9M20 4l-9 9M3 17l4 4M21 17l-4 4M9 15l-3 3M15 15l3 3" />
        </svg>
      );
    case "trophy":
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" {...p}>
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M10 16v3M14 16v3M8 21h8" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Home() {
  return (
    <>
      <nav className="nav">
        <span className="brand">
          <MedusaLogo size={30} /> MEDUSA CLIP
        </span>
        <Link href="/login" className="nav-link">ENTRAR</Link>
      </nav>
      <main className="wrap">
      {/* badge */}
      <div className="row-center">
        <div className="badge">✦ IA QUE VÊ O GAMEPLAY ✦</div>
      </div>

      {/* hero */}
      <h1 className="hero">
        Transforme gameplays
        <br />
        em <span className="ghost">clips</span> prontos
        <br />
        pra postar
      </h1>
      <p className="sub">
        Para criadores e canais de games. Gere cortes verticais 9:16 com gancho,
        legenda karaokê e enquadramento automático.
      </p>

      {/* cta */}
      <div className="cta">
        <label className="input">
          <span aria-hidden>🔗</span>
          <input placeholder="Suba um vídeo ou cole um link no painel..." readOnly />
        </label>
        <Link className="btn" href="/login">
          COMEÇAR AGORA →
        </Link>
      </div>
      <p className="supports">
        Funciona com <b>upload de vídeo</b> · <b>links públicos</b> · pronto para TikTok, Reels e Shorts
      </p>

      {/* como funciona */}
      <div className="section-tag" id="como-funciona">
        <div className="badge">COMO FUNCIONA</div>
      </div>
      <div className="steps">
        {STEPS.map((s, i) => (
          <Fragment key={s.title}>
            <div className="step">
              <div className="icon">
                <Icon name={s.icon} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
            {i < STEPS.length - 1 && <div className="arrow pixel">→</div>}
          </Fragment>
        ))}
      </div>

      {/* funciona com */}
      <div className="works">
        <span>▸ PRONTO PARA:</span>
        <span className="item">♪ TIKTOK</span>
        <span className="item">◎ REELS</span>
        <span className="item">▶ SHORTS</span>
        <span className="item">▣ CLIPES 9:16</span>
      </div>

      {/* janela clips gerados */}
      <div className="window">
        <div className="titlebar">
          <div className="dots">
            <span />
            <span />
            <span />
          </div>
          <div className="label">↧ ✕</div>
        </div>
        <div className="window-body">
          <div>
            <div className="preview pixel-preview" aria-hidden>
              <span className="px-cloud px-cloud-a" />
              <span className="px-cloud px-cloud-b" />
              <span className="px-moon" />
              <span className="px-hills" />
              <span className="px-ground" />
              <span className="px-player" />
              <div className="play" />
            </div>
            <div className="timecode">00:00 / 45:21</div>
          </div>
          <div>
            <div className="clips-title">CLIPS GERADOS</div>
            <div className="cards">
              {DEMO_CLIPS.map((c) => (
                <div className="card" key={c.hook}>
                  <div className={`thumb pixel-thumb scene-${c.scene}`}>
                    <span className="px-cloud mini-a" />
                    <span className="px-cloud mini-b" />
                    <span className="px-hills" />
                    <span className="px-ground" />
                    <span className="px-player" />
                    <span className="px-enemy" />
                    <div className="hook">{c.hook}</div>
                  </div>
                  <div className="tc">{c.tc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* por que medusa clip */}
      <div className="section-tag">
        <div className="badge">POR QUE MEDUSA CLIP</div>
      </div>
      <div className="features">
        {FEATURES.map((f) => (
          <div className="feature box" key={f.title}>
            <div className="feature-icon" aria-hidden>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>

      {/* como o usuario usa (BYO key + agente) */}
      <div className="section-tag">
        <div className="badge">COMO VOCÊ USA</div>
      </div>
      <div className="usage">
        {USAGE.map((u) => (
          <div className="usage-step box" key={u.n}>
            <div className="usage-n">{u.n}</div>
            <h3>{u.title}</h3>
            <p>{u.text}</p>
          </div>
        ))}
      </div>

      {/* preco */}
      <div className="section-tag">
        <div className="badge">PREÇO · 1 PLANO, SEM CRÉDITOS</div>
      </div>
      <div className="row-center">
        <div className="box price-card">
          <div className="plan-name">MEDUSA CLIP PRO</div>
          <div className="plan-price">
            R$11,90<span>/mês</span>
          </div>
          <ul className="dash-list">
            <li>✓ Cortes de gameplay com uso justo</li>
            <li>✓ Sem créditos — custo de IA real, direto na OpenRouter</li>
            <li>✓ Análise viral multimodal + legenda karaokê + reframe automático</li>
            <li>✓ Processamento na nuvem — nada pra instalar</li>
          </ul>
          <Link href="/login" className="btn full">
            COMEÇAR AGORA →
          </Link>
        </div>
      </div>

      {/* faq */}
      <div className="section-tag">
        <div className="badge">FAQ</div>
      </div>
      <div className="faq">
        {FAQ.map((f) => (
          <div className="faq-item box" key={f.q}>
            <h4>{f.q}</h4>
            <p>{f.a}</p>
          </div>
        ))}
      </div>

      <p className="foot">© 2026 Medusa Clip. All rights reserved.</p>
      </main>
    </>
  );
}
