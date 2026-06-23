"use client";

import { useState } from "react";
import { DISCORD_URL, GITHUB_URL } from "./site-links";

// Menu mobile (hamburguer). No desktop fica escondido (CSS); no mobile (<=780px)
// substitui a .nav-menu + .nav-actions, que sao escondidas — assim os links de
// secao nao "somem" no celular. Mesmos destinos da nav desktop + sociais + APOIAR.
type Item = { href: string; label: string; external?: boolean };

const ITEMS: Item[] = [
  { href: "#recursos", label: "RECURSOS" },
  { href: "#exemplos", label: "EXEMPLOS" },
  { href: "#download", label: "DOWNLOAD" },
  { href: "#custo", label: "CUSTO" },
  { href: "#liberdade", label: "OPEN SOURCE" },
  { href: GITHUB_URL, label: "GITHUB", external: true },
  { href: DISCORD_URL, label: "DISCORD", external: true },
  { href: "/apoiar", label: "APOIAR" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`burger${open ? " is-open" : ""}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <>
          {/* backdrop transparente: clicar fora fecha o menu */}
          <button
            type="button"
            className="mobile-nav-backdrop"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div className="mobile-nav-menu" id="mobile-nav-menu">
            {ITEMS.map((it) => (
              <a
                key={it.label}
                href={it.href}
                onClick={() => setOpen(false)}
                {...(it.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {it.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
