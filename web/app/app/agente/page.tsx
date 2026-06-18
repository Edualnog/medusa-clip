export default function AgentePage() {
  return (
    <div>
      <div className="badge">AGENTE LOCAL</div>
      <div className="box panel-card">
        <p className="dash-list" style={{ margin: 0 }}>
          O corte do vídeo roda <b>no seu PC</b> (mais rápido e sem custo de
          servidor). Baixe e abra o agente — ele conecta nesta conta e executa os
          jobs que você criar.
        </p>
        <div className="agent-status">
          <span className="dot-off" /> AGENTE: DESCONECTADO
        </div>
        <button className="btn" style={{ alignSelf: "flex-start" }} disabled>
          BAIXAR AGENTE (em breve)
        </button>
      </div>
      <p className="hint">Em construção (Fase 3 / Fase 6).</p>
    </div>
  );
}
