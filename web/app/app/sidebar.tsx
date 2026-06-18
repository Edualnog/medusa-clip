"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MedusaLogo } from "../medusa-logo";

const LINKS = [
  { href: "/app", label: "INÍCIO", icon: "🏠" },
  { href: "/app/biblioteca", label: "BIBLIOTECA", icon: "🎬" },
  { href: "/app/apis", label: "CHAVES API", icon: "🔑" },
  { href: "/app/conta", label: "CONTA", icon: "👤" },
];

export default function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="side2">
      <Link href="/app" className="side2-brand" title="Zorothax">
        <MedusaLogo size={40} />
      </Link>
      <div className="side2-user" title={email}>
        {(email[0] ?? "?").toUpperCase()}
      </div>

      <nav className="side2-nav">
        {LINKS.map((l) => {
          const active = l.href === "/app" ? path === "/app" : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={`side2-link${active ? " active" : ""}`}>
              <span className="side2-icon" aria-hidden>{l.icon}</span>
              <span className="side2-label">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <button className="side2-link side2-logout" onClick={logout}>
        <span className="side2-icon" aria-hidden>⎋</span>
        <span className="side2-label">SAIR</span>
      </button>
    </aside>
  );
}
