// Landing 8-bit do Medusa Cut. Estatica por enquanto — auth + app vem nas
// proximas fases. O design segue a referencia pixel/gamer.
import { Fragment } from "react";
import Link from "next/link";
import { MedusaLogo } from "./medusa-logo";

const STEPS = [
  { icon: "gamepad", title: "1. COLE O LINK", text: "Cole o link do seu vídeo de gameplay" },
  { icon: "ai", title: "2. IA ANALISA", text: "Nossa IA encontra as melhores jogadas e momentos do vídeo" },
  { icon: "swords", title: "3. CORTES ÉPICOS", text: "Criamos clips de jogadas épicas, wins, fails e momentos engraçados" },
  { icon: "trophy", title: "4. BAIXE E COMPARTILHE", text: "Baixe, edite como quiser e publique para sua comunidade" },
];

const DEMO_CLIPS = [
  { hook: "TRIPLE KILL!", tc: "00:01 - 00:15" },
  { hook: "VICTORY!", tc: "00:15 - 00:32" },
  { hook: "PENTA KILL!", tc: "00:32 - 00:48" },
  { hook: "WTF?!", tc: "00:48 - 01:02" },
  { hook: "EPIC WIN!", tc: "01:02 - 01:18" },
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
          <MedusaLogo size={30} /> MEDUSA CUT
        </span>
        <Link href="/login" className="nav-link">ENTRAR</Link>
      </nav>
      <main className="wrap">
      {/* badge */}
      <div className="row-center">
        <div className="badge">✦ NOVO: IA AINDA MAIS PRECISA ✦</div>
      </div>

      {/* hero */}
      <h1 className="hero">
        Transforme vídeos de games
        <br />
        em <span className="ghost">clips</span> perfeitos
      </h1>
      <p className="sub">
        Para criadores e canais de games. Corte os melhores momentos, jogadas
        épicas, wins, fails e momentos engraçados dos seus vídeos de gameplay.
      </p>

      {/* cta */}
      <div className="cta">
        <label className="input">
          <span aria-hidden>🔗</span>
          <input placeholder="Cole o link do seu vídeo de gameplay aqui..." />
        </label>
        <Link className="btn" href="/app">
          GERAR CLIPS →
        </Link>
      </div>
      <p className="supports">
        Suporta <b>▶ YouTube</b> · <b>♪ TikTok</b> · e muito mais
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
        <span>▸ FUNCIONA COM:</span>
        <span className="item">▶ YOUTUBE</span>
        <span className="item">♪ TIKTOK</span>
        <span className="item">◎ INSTAGRAM</span>
        <span className="item">f FACEBOOK</span>
        <span>⋯ E MAIS...</span>
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
            <div className="preview">
              <div className="play" />
            </div>
            <div className="timecode">00:00 / 45:21</div>
          </div>
          <div>
            <div className="clips-title">CLIPS GERADOS</div>
            <div className="cards">
              {DEMO_CLIPS.map((c) => (
                <div className="card" key={c.hook}>
                  <div className="thumb">
                    <div className="hook">{c.hook}</div>
                  </div>
                  <div className="tc">{c.tc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="foot">Medusa Cut · clips de games nível Opus Clip</p>
      </main>
    </>
  );
}
