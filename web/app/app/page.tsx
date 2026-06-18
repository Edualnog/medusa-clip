// Secao "Gerar" do dashboard (area de trabalho principal).
const OPTS = ["LAYOUT: FACECAM", "LEGENDA: KARAOKÊ", "DURAÇÃO: 60–180s", "VIRAL: LLM"];

export default function GerarPage() {
  return (
    <div>
      <div className="badge">GERAR CLIPS</div>

      <div className="box panel-card">
        <label className="input">
          <span aria-hidden>🔗</span>
          <input placeholder="Cole o link do vídeo de gameplay..." />
        </label>
        <div className="opts">
          {OPTS.map((o) => (
            <span className="chip" key={o}>
              {o}
            </span>
          ))}
        </div>
        <button className="btn" style={{ alignSelf: "flex-start" }}>
          GERAR CLIPS →
        </button>
      </div>

      <p className="hint">
        ⚠️ Conecte sua chave (aba <b>APIs</b>) e seu <b>agente local</b> (aba AGENTE)
        pra começar. Geração em construção (Fase 3).
      </p>

      <div className="badge" style={{ marginTop: 36 }}>
        CLIPS GERADOS
      </div>
      <div className="empty">Nenhum clip ainda — gere o primeiro. 🎮</div>
    </div>
  );
}
