# CLAUDE.md — Medusa Clip

Contexto para o Claude Code. Leia antes de codar.

> ⚠️ DIRECAO ATUAL (2026-06-18): app **desktop local-first** ("Medusa Clip",
> medusaclip.com). O processamento roda **no PC do usuario** (app Electron com motor +
> ffmpeg embutidos) — NAO em VPS, NAO em worker na nuvem. A VPS/worker foi abandonada.
> O motor de cortes Python foi reaproveitado integral, agora empacotado como binario.

## O que e

**App desktop para criadores de games**: o usuario instala o Medusa Clip, entra na
conta, conecta a **propria** chave de IA (OpenRouter, OpenAI ou Anthropic), escolhe um video local (ou cola um
link publico) e recebe **cortes verticais 9:16** nivel Opus Clip (ganchos, legenda
karaoke, enquadramento) — tudo processado **na propria maquina**. App **gratuito**
(sem assinatura), **sem creditos** — o custo de IA (LLM) e do usuario, pela chave dele.
Estrategia: base enorme de usuarios primeiro, **monetizar de outra forma no futuro**
(modelo ainda nao definido).
Privacidade por padrao: **o gameplay nunca sobe pra nuvem**.

## Arquitetura: app Electron (local) + Supabase (so conta)

Processamento de video (yt-dlp, ffmpeg, whisper, render) e **pesado** e roda **100%
no computador do usuario**, dentro do app Electron. Supabase serve apenas conta/auth —
videos e clipes ficam no disco do usuario.

```
DESKTOP (Electron @ PC do usuario)        SUPABASE (so conta)
  renderer/  UI 8-bit (3 views)             auth (login)
  main.js    spawn do motor (binario)       (sem billing — app gratis)
  engine/    medusacut-engine + ffmpeg      (NENHUM video sobe pra ca)
             + ffprobe (embutidos)
  config.json (userData): provider + chave de IA local (por provedor)
  ~/Downloads/Medusa Clip/: biblioteca de clipes

WEB (Next.js @ Vercel)
  landing 8-bit + downloads + login/conta
```

- **Desktop**: faz todo o trabalho pesado; o motor e um **binario** (`medusacut-engine`)
  chamado por `main.js` via `spawn`, que repassa progresso em JSON linha a linha.
  `ffmpeg`/`ffprobe` vivem em `desktop/engine/` e entram no PATH do subprocesso —
  self-contained, sem dep do sistema nem Python instalado.
- **Web (Vercel)**: so a landing + downloads + login. Sem worker, sem fila de jobs.
- **Supabase**: auth/conta. **Nao** guarda video/clipe. **Sem billing** (app gratis).
- **Custo de compute e do USUARIO** (CPU/banda/disco dele). O dono so paga site + auth.

## Regras inegociaveis (seguranca + modelo)

- **BYO key**: cada usuario usa a PROPRIA chave de IA — **OpenRouter**, **OpenAI** ou
  **Anthropic** (escolhe o provedor no app). **NUNCA** publicar a chave do dono nem rodar
  IA "as custas da casa". A chave fica salva **no dispositivo do usuario** (`config.json`
  em userData, cifrada, uma por provedor) e vai direto pro provedor — nunca passa por
  servidor nosso. No motor: `LLM_PROVIDER` + `LLM_API_KEY`; OpenRouter/OpenAI via SDK
  da OpenAI (base_url), Anthropic via SDK nativo `anthropic` (API != OpenAI).
- **Local-first**: video bruto e clipes **nunca** saem do PC do usuario. Nada de
  upload de gameplay pra Supabase/nuvem.
- **App gratuito**: sem assinatura, sem creditos. Custo de IA e do usuario (BYO key).
  Monetizacao futura ainda nao definida — nao assumir/implementar cobranca.
- Segredos de servidor (se houver, p/ billing): **so no servidor** (env Vercel),
  nunca `NEXT_PUBLIC`, nunca no git.

## Onde mora a qualidade ("nivel Opus Clip")

No motor (`agent/src/medusacut/`). **Prioridade: rapido E bom** — em 2026-06-21 o
pipeline foi muito simplificado/acelerado (de ~25min p/ ~3-5min num video de 12min).

1. **Transcricao** (`transcribe/whisper.py`): default `base` + greedy (`beam_size=1`,
   `condition_on_previous_text=False`). **DOIS backends, auto:** **MLX** (GPU/Neural
   Engine no Mac Apple Silicon, ~3x — via `mlx-whisper`) e **faster-whisper** (CPU, ou
   **GPU NVIDIA/CUDA** no Win/Linux quando ha libs). Fallback seguro: se MLX/CUDA
   falhar, cai pra CPU sem quebrar. Override: `MEDUSA_WHISPER_BACKEND`, `MEDUSA_WHISPER_DEVICE`.
2. **Analise viral multimodal + multi-modelo** (`hooks/`, `frames.py`, `llm.py`):
   triagem barata (texto) -> juiz forte que VE keyframes -> re-rank. Chamadas de IA
   rodam em **paralelo** (`MEDUSA_LLM_WORKERS`, default 4).
3. **Legenda karaoke + hook** (`caption/karaoke.py`): queimadas, estilo gamer (ffmpeg
   local sem libass/drawtext -> Pillow desenha PNGs). Compostas como **faixa alpha
   (qtrle) + overlay unico, FUNDIDO no mesmo encode do render** (1 passada — NAO 2).
   - Legenda: palavra a palavra (karaoke). Hook: manchete nos **primeiros ~5s**, na
     divisa abaixo da facecam (`build_hook_track`).
   - A versao antiga passava 1 input ffmpeg por palavra e **estourava** em corte longo
     (cortes saiam SEM legenda) — nao voltar a esse modelo.
4. **Reframe/layout** (`reframe/compose.py`): **SO 2 LAYOUTS** (decisao de produto;
   sem optical-flow, sem scene-aware, sem VLM — removidos p/ velocidade/simplicidade):
   - **A `facecam_top_gameplay_bottom`**: facecam FIT-centralizada no **terco superior**
     (`PANEL_H`) com laterais no blur, gameplay preenchendo embaixo (cover). Igual "model 1".
   - **B `gameplay_blur`**: gameplay tela cheia + fundo desfocado (foco 100% na acao).
   - **Facecam**: auto-deteccao YuNet **so nos cantos superiores** (`facecam._in_top_corner`
     — 95% dos casos; ignora rosto de NPC no meio). Achou -> A; nao achou -> B.
   - Render dos cortes em **paralelo** (filtergraph satura pouco; `MEDUSA_RENDER_WORKERS`).
5. **Ingest** (`ingest/youtube.py`): baixa **h264 <=1080p** (evita AV1 1440p, que o
   ffmpeg embutido decodifica MUITO devagar — era o gargalo de ~25min).

## Monorepo

```
agent/    # Python: motor de cortes (`medusacut`). Empacotado como binario p/ o desktop.
  src/medusacut/  cli.py · pipeline.py · types.py · llm.py · frames.py
                  ingest/ transcribe/ signals/ hooks/ reframe/ caption/ render/ ui/
  tests/  pyproject.toml  Makefile  docs/ARCHITECTURE.md
desktop/  # App Electron (o produto). main.js · preload.js · renderer/ (UI 8-bit)
          # engine/ (medusacut-engine + ffmpeg + ffprobe embutidos) · scripts/build_app.sh
web/      # Next.js (App Router) @ Vercel: landing 8-bit + downloads + login
docs/     # SETUP.md
```

> Supabase: **auth** (`auth.users` nativo) + **1 tabela**: `legal_acceptances`
> (`supabase/migrations/0001_legal_acceptances.sql`) — **prova de aceite** dos termos
> (user_id/version/accepts/accepted_at, RLS, imutavel). O desktop grava cada aceite via
> sessao do user (`recordAcceptance`/`syncAcceptance` no `main.js`, com retry/backfill).
> App gratuito — sem billing.
>
> Backend minimo na web: rota privilegiada `web/app/api/account/delete` (runtime
> nodejs) usa a **`SUPABASE_SERVICE_ROLE_KEY`** (server-only, env da Vercel / `.env.local`)
> pra excluir a conta do proprio usuario. A service_role **nunca** vai pro desktop/client
> nem pro git. O desktop chama essa rota mandando o access_token do usuario (`API_BASE`,
> default `https://medusaclip.com`, override via `MEDUSA_API_BASE`). Ver `web/.env.example`.

## Deploy da web (Vercel)

- **Monorepo**: na Vercel, **Root Directory = `web`** (o Next.js nao esta na raiz).
- **Env vars** (Settings → Environment Variables): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publicas) e `SUPABASE_SERVICE_ROLE_KEY` (secreta).
  As `NEXT_PUBLIC_*` sao embutidas no build -> ao mudar, **rebuildar**.
- **Sem middleware**: a web nao tem `middleware.ts` (auth e client-side; a rota de
  exclusao valida o token sozinha). Nao reintroduzir o middleware do Supabase SSR
  (quebrava no Edge -> `MIDDLEWARE_INVOCATION_FAILED`).
- Auto-deploy da Vercel exige que o **email do autor do commit** exista na conta do
  GitHub (`git config user.email`). Email errado -> deploy recusado.

## Convencoes

**Motor (Python)**: Python 3.11+, type hints, `from __future__ import annotations`.
Deps pesadas (yt_dlp, faster_whisper, cv2, openai, anthropic, mlx_whisper, PIL)
importadas DENTRO das funcoes. `mlx-whisper` e dep **so do Mac arm64** (marker no
pyproject); `build_engine.sh` so bundla MLX se presente e EXCLUI `torch` (mlx declara
mas nao usa em runtime — senao +688MB). Teste por capacidade nova em `agent/tests/`.

**Desktop (Electron)**: `main.js` (nodejs, processo principal) fala com o motor por
`spawn` + JSON; `renderer/` e UI pura (HTML/CSS/JS, sem framework). CSP travada;
fontes pixel **bundladas** (`renderer/fonts/`, sem Google Fonts) p/ funcionar offline.
Build via `electron-builder` (`scripts/build_app.sh`): `.dmg` (mac, sem assinatura
por enquanto), `.exe`/nsis (win).

**Web (Next.js)**: TypeScript, App Router. Estilo **8-bit gamer**: fonte pixel
(Press Start 2P / VT323), fundo preto, bordas pixeladas. Paleta preto/branco-quente/
amarelo. Segredo de servidor SO em rotas `app/api/*` (runtime nodejs).

**Geral**: `out/`, `dist/`, `.env`, `.env*.local`, video e `node_modules` NUNCA no git.
O dono conecta as contas (Supabase, Vercel); o Claude escreve o codigo e **guia o
dono passo a passo** no deploy (ver `docs/SETUP.md`).

## Status / roadmap

- [x] Motor de cortes completo (viral multimodal, legenda, reframe, custo).
- [x] Motor empacotado como binario + ffmpeg/ffprobe embutidos no app.
- [x] App desktop Electron: UI 8-bit (Inicio / Biblioteca / Chaves API), preview de
      link do YouTube, progresso, biblioteca local.
- [x] Build do instalador `.dmg` (electron-builder, sem assinatura).
- [x] Landing 8-bit refocada no app desktop (downloads "em breve" por plataforma).
- [x] Login no app desktop: email/senha via Supabase (auth no `main.js`, sessao
      local em config.json, gate de tela de login).
- [x] Onboarding de 1o acesso: aceites (Termos, Privacidade, responsabilidade de
      conteudo, 18+) + escolha da pasta dos clips. Textos legais em
      `desktop/renderer/legal.js` (espelho em `docs/legal/`). `LEGAL_VERSION` no `main.js`.
- [x] Multi-provedor de IA (BYO key): OpenRouter, OpenAI e Anthropic. Seletor de provedor
      na aba Chaves API; chave salva por provedor; validacao por provedor (sem custo);
      motor (`llm.py`) dispatcha por `LLM_PROVIDER` (OpenAI-compat vs SDK nativo Anthropic).
- [x] **Performance (v0.1.15-0.1.17, ~25min -> ~3-5min num video de 12min):** download
      h264 <=1080p (mata o AV1 1440p); transcricao MLX (GPU Mac, ~3x) / CUDA (GPU Win) /
      CPU fallback; legenda fundida no render (1 encode); IA viral e render em PARALELO.
- [x] **Layout v0.1.14: 2 modelos** (facecam terco superior + blur / foco na acao tela
      cheia); facecam so nos cantos superiores; removido scene-aware/VLM/optical-flow.
- [x] **Hook queimado** no clipe (manchete, primeiros ~5s) + **score de viralizacao
      colorido por faixa** no card (v0.1.19).
- [x] App: **player do clipe DENTRO do app** (modal) + preview no hover (URL por id,
      `zclip://clip/<id>`) + ordenacao da biblioteca + progresso animado + icone GitHub +
      "baixar e instalar" no Mac (baixa+abre o .dmg).
- [x] Seguranca: chave de IA (por provedor) e tokens de sessao **cifrados** no disco via
      `safeStorage` (migra config antigo em texto puro). Fallback texto puro no
      Linux sem keyring (flag `secretsPlaintext`).
- [ ] **Seguranca pendente**: assinatura/notarizacao de codigo (mac `identity:null`,
      win sem assinatura -> avisos de Gatekeeper/SmartScreen); auto-update seguro;
      revisao juridica dos textos legais; rotacao dos segredos cloud antigos (R2/service_role).
- [ ] Liberar instaladores assinados por plataforma (mac/win/linux — target Linux
      AppImage ja configurado no electron-builder).
- [ ] **GPU no Windows "de fabrica" (NVIDIA):** o codigo ja usa CUDA se as libs
      (cuBLAS/cuDNN) existirem, mas pra funcionar sem o usuario instalar nada precisa
      entregar a cuDNN — sem wheel limpo p/ Windows + licenca NVIDIA + **precisa de
      maquina Windows+NVIDIA pra validar** (nem o CI tem GPU). Pendente de hardware de teste.
- [ ] Monetizacao futura (modelo a definir) — **NAO** ha assinatura/cobranca; app gratis.
- [ ] Deploy completo (Vercel + distribuicao dos builds) e onboarding.

## Comandos

```bash
cd agent && make setup && make test           # motor de cortes
cd desktop && npm install && npm start         # app Electron (dev)
cd desktop && npm run dist                      # gera instalador (electron-builder)
cd web && npm install && npm run dev            # landing -> http://localhost:3000
```
