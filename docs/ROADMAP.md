# Roadmap técnico — Medusa Clip local-first

> App **gratuito** (sem assinatura, sem créditos), **local-first** e **BYO key**: o
> usuário usa a própria chave da OpenRouter e todo o processamento de vídeo roda na
> máquina dele. Monetização futura ainda **não definida** — não há cobrança. Código
> **source-available** num único repo público (`Edualnog/medusa-cut`).

## Arquitetura-alvo

```text
SITE NEXT.JS (Vercel)
  landing pública 8-bit
  autenticação Supabase + download do app
             │
             ▼
SUPABASE (só conta)
  Authentication
  1 tabela: legal_acceptances (prova de aceite dos termos, RLS, imutável)
  (sem billing, sem entitlement, nenhum vídeo)
             │
             ▼
APP ELECTRON (PC do usuário)
  login (email/senha) — sessão local cifrada (safeStorage)
  chave OpenRouter protegida localmente (safeStorage) → vai direto pra OpenRouter
  motor Python + FFmpeg/FFprobe embutidos (binário)
  processamento e biblioteca 100% locais
```

Supabase serve apenas conta/auth e a prova de aceite legal; não participa do pipeline
de vídeo. Nenhum arquivo de gameplay passa pelo backend. Os instaladores e o feed de
auto-update são publicados como GitHub Releases **neste mesmo repo público**, sem token
no app.

## Estado em 20/06/2026

### Implementado

- motor Python completo: ingestão, sinais de áudio/movimento, seleção de candidatos,
  transcrição com timestamps, análise multimodal/multi-modelo via OpenRouter, reframe
  dinâmico + layouts + facecam, legenda karaokê, render H.264/AAC com FFmpeg;
- motor empacotado como **binário** + FFmpeg/FFprobe embutidos (self-contained, sem
  Python no sistema);
- app Electron: UI 8-bit (Início/Biblioteca/Chaves), geração, progresso, biblioteca
  local, custo acumulado;
- login no desktop (email/senha via Supabase) com gate de tela e sessão local cifrada;
- onboarding de 1º acesso: aceites legais (Termos/Privacidade/conteúdo/18+) + escolha
  da pasta de clips; prova de aceite gravada no Supabase (`legal_acceptances`);
- segurança: chave OpenRouter e tokens de sessão **cifrados** no disco via `safeStorage`
  (migra config antigo em texto puro; fallback Linux sem keyring);
- landing 8-bit em Next.js refocada no app desktop + links de download;
- rota privilegiada `web/app/api/account/delete` (service_role, server-only) p/ o
  usuário excluir a própria conta;
- **CI de release single-repo**: matriz GitHub Actions builda macOS arm64 + Windows x64
  + Linux x86_64 nativamente e publica a Release neste repo via `GITHUB_TOKEN`;
- auto-update via `electron-updater` lendo o feed público (sem token no app);
- testes unitários do motor passando.

### Parcial ou pendente

- **assinatura/notarização de código**: builds não assinados (mac `identity:null`,
  Windows sem cert) → avisos de Gatekeeper/SmartScreen; no macOS sem assinatura o
  auto-update não troca o binário (só avisa e manda baixar no site);
- rotação dos segredos cloud antigos (R2/service_role) e revisão jurídica dos textos
  legais;
- worker de VPS e migrations Supabase do desenho antigo permanecem no repo como legado;
- auto-detecção de facecam pode não ser acionada no fluxo padrão em alguns casos;
- faltam testes end-to-end do app empacotado e do render real.

## Etapa A — Estabilização do processamento local

Objetivo: tornar o fluxo confiável antes da distribuição ampla.

- revisar o layout com auto-detecção de facecam (cair em `gameplay_blur` quando não há
  rosto, nunca faixa vazia);
- cancelamento de geração e recuperação após falha;
- validar espaço em disco, memória, arquitetura e codecs antes do job;
- melhorar mensagens de erro e logs de diagnóstico exportáveis;
- testar MP4, MOV, MKV e WebM em codecs e durações variados;
- testes de integração com pequenos fixtures de vídeo.

Critério: geração completa reproduzível sem dependências instaladas manualmente e sem
perda de resultados após reiniciar o app.

## Etapa B — Builds assinados multiplataforma

Objetivo: instaladores sem avisos de segurança do SO.

### macOS Apple Silicon (`arm64`)
- motor PyInstaller `arm64`, Electron e FFmpeg `arm64`, `.dmg`;
- **assinatura + notarização** (Apple Developer, US$99/ano) → destrava auto-update
  nativo e remove o Gatekeeper. (macOS Intel foi descontinuado — só Apple Silicon.)

### Windows (`x64`)
- motor PyInstaller `x64` (`.exe`), FFmpeg/FFprobe Windows, instalador NSIS;
- assinatura de código → remove o SmartScreen.

### Linux (`x64`)
- motor PyInstaller `x64`, FFmpeg/FFprobe compatíveis, `.AppImage` (principal) e `.deb`
  opcional; teste em Ubuntu LTS limpo.

O build acontece **nativamente** em cada SO/arquitetura — não é seguro depender de
cross-compilation para o stack Python/ML.

## Etapa C — CI, distribuição e atualização ✅

Objetivo: publicar versões sem processo manual frágil.

- [x] matriz de build no GitHub Actions (3 SOs nativos);
- [x] release única por tag `v*`, publicada neste repo via `GITHUB_TOKEN`
      (sem PAT cross-repo, sem secret);
- [x] `version` em `desktop/package.json` como fonte da verdade do updater;
- [x] feeds `latest*.yml` + instaladores como assets da Release;
- [ ] rodar testes/checks antes de gerar instaladores;
- [ ] checksums SHA-256 e notas de versão automáticas;
- [ ] canais estável e beta + rollback de versão.

## Etapa D — Operação e monetização (futura, indefinida)

O app é **gratuito** e a monetização ainda não foi decidida — **não** implementar
cobrança/assinatura. Quando houver modelo, ele não deve introduzir processamento cloud
de vídeo nem quebrar a privacidade local-first.

- estratégia: construir base grande de usuários primeiro, monetizar depois;
- telemetria técnica **opcional**, sem conteúdo de vídeo, com consentimento explícito;
- suporte a diagnóstico com consentimento;
- política de privacidade e termos publicados (revisão jurídica pendente).

## Ordem recomendada imediata

1. Etapa A: estabilizar o app local (facecam, cancelamento, codecs).
2. Etapa B: assinar/notarizar os builds quando houver conta Apple Developer.
3. Etapa C (restante): testes no CI, checksums, canais beta/rollback.
4. Etapa D: só quando/se o modelo de monetização for definido.
