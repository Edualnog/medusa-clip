"use client";

import { useState } from "react";
import Link from "next/link";
import { MedusaLogo } from "../medusa-logo";

const CURRENCY_SYMBOL = "R$";

// Payment Links do Stripe — um por valor (doação única, BRL).
// COLE AQUI a URL de cada link (formato https://buy.stripe.com/...).
// Enquanto vazio, o botão aparece como "EM BREVE" (não quebra a página).
const STRIPE_LINKS: Record<number, string> = {
  5: "https://buy.stripe.com/6oUcN5gDueD84qt3gqgw000",
  15: "https://buy.stripe.com/9B66oHfzqeD82il4kugw001",
  25: "https://buy.stripe.com/fZufZh4UM0Mi4qt4kugw002",
  50: "https://buy.stripe.com/fZu9AT1IA3YucWZ18igw003",
  100: "https://buy.stripe.com/bJe3cv0Ew7aG6yB2cmgw004",
  150: "https://buy.stripe.com/3cI8wP5YQ9iO4qt9EOgw005",
};

const PRESETS = [5, 15, 25, 50, 100, 150];

export default function ApoiarPage() {
  const [selected, setSelected] = useState<number>(25);

  const link = STRIPE_LINKS[selected] || "";
  const ready = Boolean(link);

  return (
    <>
      <header className="site-header">
        <nav className="nav shell-width" aria-label="Navegação">
          <Link href="/" className="brand" aria-label="Medusa Clip — início">
            <MedusaLogo size={34} />
            <span>MEDUSA CLIP</span>
            <span className="beta-tag">BETA</span>
          </Link>
          <div className="nav-menu">
            <Link href="/">INÍCIO</Link>
            <Link href="/#download">DOWNLOAD</Link>
            <a href="https://github.com/Edualnog/medusa-cut" target="_blank" rel="noopener noreferrer">
              GITHUB
            </a>
          </div>
          <Link href="/#download" className="nav-login">
            BAIXAR
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero donate-hero shell-width">
          <div className="hero-copy">
            <div className="eyebrow">APOIE O PROJETO · OPEN SOURCE</div>
            <h1>
              AJUDE O MEDUSA CLIP
              <br />
              <span>A CRESCER.</span>
            </h1>
            <p className="hero-text">
              O Medusa Clip é <strong>grátis e open source (AGPL-3.0)</strong>: sem
              anúncios, sem paywall, sem vender seus dados. Se ele te economiza tempo,
              considere apoiar — é o que mantém o desenvolvimento de pé.
            </p>
            <p className="hero-text">
              No espírito do Blender: <strong>feito pela comunidade, pra comunidade</strong>.
              Escolha um valor e contribua em segundos. Toda doação conta. Valeu!
            </p>
            <p className="hero-note">DOAÇÃO OPCIONAL · NUNCA UM PAYWALL · O APP SEGUE GRÁTIS</p>
          </div>

          <div className="donate-card">
            <p className="donate-sub">FAÇA UMA DOAÇÃO ÚNICA</p>

            <div className="donate-amounts">
              {PRESETS.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={selected === value ? "donate-amount selected" : "donate-amount"}
                  onClick={() => setSelected(value)}
                >
                  {CURRENCY_SYMBOL} {value}
                </button>
              ))}
            </div>

            <a
              className={ready ? "button button-primary donate-submit" : "button button-primary donate-submit disabled"}
              href={ready ? link : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!ready}
            >
              {ready ? `DOAR ${CURRENCY_SYMBOL} ${selected} →` : "EM BREVE"}
            </a>

            <p className="donate-foot">
              Pagamento seguro via <strong>Stripe</strong> — cartão ou Pix. O valor vai
              direto pro projeto.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer shell-width">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <MedusaLogo size={28} />
            <span>MEDUSA CLIP</span>
            <span className="beta-tag">BETA</span>
          </Link>
          <a className="footer-support" href="mailto:suporte@medusaclip.com">
            SUPORTE@MEDUSACLIP.COM
          </a>
        </div>
        <p>© 2026 MEDUSA CLIP · OPEN SOURCE (AGPL-3.0) · SEM CADASTRO</p>
        <div className="footer-social">
          <Link href="/#download" className="footer-login">BAIXAR</Link>
        </div>
      </footer>
    </>
  );
}
