export default function ApisPage() {
  return (
    <div>
      <div className="badge">APIs · SUA CHAVE</div>
      <div className="box panel-card">
        <p className="dash-list" style={{ margin: 0 }}>
          Conecte sua <b>chave da OpenRouter</b>. Você paga o custo da IA direto pra
          OpenRouter (centavos por vídeo) — por isso a Medusa é mais barata, sem
          créditos inflados.
        </p>
        <label className="field" style={{ margin: 0 }}>
          <span>OPENROUTER API KEY</span>
          <input type="password" placeholder="sk-or-v1-..." disabled />
        </label>
        <button className="btn" style={{ alignSelf: "flex-start" }} disabled>
          SALVAR (em breve)
        </button>
      </div>
      <p className="hint">
        Guardada com segurança (criptografada + RLS), nunca exposta no navegador.
        Em construção (Fase 2).
      </p>
    </div>
  );
}
