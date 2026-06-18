import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

// Painel protegido. Sem sessao -> manda pro login.
export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main>
      <nav className="nav">
        <span className="brand">✦ MEDUSA CUT</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="dash-email">{user.email}</span>
          <LogoutButton />
        </div>
      </nav>

      <div className="dash">
        <div className="badge">PAINEL</div>
        <h1 className="hero" style={{ fontSize: "clamp(24px,4vw,40px)", marginTop: 24 }}>
          Bem-vindo, jogador!
        </h1>

        <div className="box" style={{ padding: 28, marginTop: 24 }}>
          <h3 className="label" style={{ marginBottom: 14 }}>PRÓXIMOS PASSOS (em construção)</h3>
          <ul className="dash-list">
            <li>🔑 Aba <b>APIs</b> — conectar sua chave da OpenRouter (Fase 2)</li>
            <li>🔗 Colar link e <b>gerar clips</b> via agente local (Fase 3)</li>
            <li>🎬 <b>Biblioteca</b> de clipes + progresso em tempo real (Fase 4)</li>
          </ul>
          <p className="dash-note">
            Login funcionando ✓ — você está autenticado pelo Supabase.
          </p>
        </div>
      </div>
    </main>
  );
}
