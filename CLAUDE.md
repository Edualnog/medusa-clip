# CLAUDE.md — Medusa Cut

Contexto para o Claude Code. Leia antes de codar.

> ⚠️ MUDANCA DE DIRECAO (2026-06-17): o projeto deixou de ser ferramenta pessoal e
> virou **SaaS**. Tudo abaixo reflete a nova premissa. O motor de cortes (Python)
> que ja existia foi reaproveitado como **agente local** — nada se perdeu.

## O que e

**SaaS para criadores de games**: o usuario faz login, conecta a **propria** chave
da OpenRouter, cola um link do YouTube e recebe **cortes verticais 9:16** com
qualidade nivel Opus Clip (ganchos, legenda karaoke, enquadramento). Assinatura
simples e barata (~R$11,90/mes), **sem sistema de creditos** — o custo de IA e do
usuario (chave dele).

## Arquitetura: web + Supabase + AGENTE LOCAL

O processamento de video (download, ffmpeg, whisper) e **pesado e demorado** —
NAO roda em serverless (Vercel). Entao roda **na maquina do usuario**, via um
agente local. A web e o "painel de controle"; o Supabase e o backend.

```
WEB (Next.js @ Vercel)            AGENTE LOCAL (Python, ex-pipeline)
  landing 8-bit + login            loga no Supabase (como o user)
  aba "APIs": chave OpenRouter     pega jobs do user
  cola link -> cria job            baixa+corta NO PC do user
  biblioteca de clipes            usa a chave do PROPRIO user (local)
  assinatura                       reporta progresso/clipes
        \                                   /
         \------------ SUPABASE ----------/
          (auth + Postgres + storage + realtime = o backend)
```

- **Sem servidor de processamento proprio** → custo de operacao ~zero (sustenta
  a assinatura barata). O usuario traz a propria chave E a propria maquina.
- O Supabase e o "message bus": a web cria um `job`, o agente le, executa e
  escreve progresso/resultado de volta; a web mostra em realtime.

## Regras inegociaveis (seguranca + modelo)

- **BYO key**: cada usuario usa a PROPRIA chave da OpenRouter. **NUNCA** publicar
  a chave do dono nem rodar IA "as custas da casa". A chave do usuario fica no
  Supabase com RLS + criptografada, **nunca** volta pro navegador depois de salva,
  e e usada pelo agente **localmente**.
- **Sem creditos**: a cobranca e assinatura; o custo de IA e do usuario.
- **Multi-tenant de verdade**: RLS no Supabase em TODAS as tabelas — um usuario so
  enxerga os proprios dados.
- **Download/render rodam no PC do usuario** (evita custo central e o problema de
  baixar do YouTube do lado do servidor).

## Onde mora a qualidade ("nivel Opus Clip")

Continua no agente (`agent/src/medusacut/`), inalterado pela virada SaaS:

1. **Analise viral multimodal + multi-modelo** (`hooks/`, `frames.py`, `llm.py`):
   triagem barata (texto) -> juiz forte que VE keyframes -> re-rank. Maior alavanca.
2. **Legenda karaoke** (`caption/`): queimada, palavra a palavra, estilo gamer.
3. **Reframe** (`reframe/`): segue a acao (ciente de corte de cena), facecam
   auto-detectado, layouts (facecam-em-cima, fundo desfocado).

Selecao de momento por **fusao de sinais** (audio + cena), nao por transcricao.

## Monorepo

```
agent/    # Python: o motor de cortes (ex-`medusacut`) + virara worker do Supabase
  src/medusacut/  cli.py · pipeline.py · types.py · llm.py · frames.py
                  ingest/ transcribe/ signals/ hooks/ reframe/ caption/ render/ ui/
  tests/  pyproject.toml  Makefile  docs/ARCHITECTURE.md
web/      # Next.js (App Router) @ Vercel: landing 8-bit, auth, painel, biblioteca
supabase/ # schema/migrations, RLS, policies
```

## Convencoes

**Agente (Python)**
- Python 3.11+, type hints, `from __future__ import annotations`.
- Deps pesadas (yt_dlp, faster_whisper, cv2, openai, PIL) importadas DENTRO das
  funcoes — `import medusacut` continua leve.
- Cada capacidade nova vem com teste em `agent/tests/`.
- Versoes pinadas no `pyproject` (stack de ML e fragil).

**Web (Next.js)**
- TypeScript, App Router. Estilo **8-bit gamer** (ver design de referencia): fonte
  pixel (Press Start 2P), fundo preto estrelado, bordas pixeladas.
- Supabase client; auth + RLS; nada de segredo no client.

**Geral**
- `out/`, `.env`, `.env*.local`, arquivos de video e `node_modules` NUNCA entram
  no git. Segredos so em `.env*.local` (web) / `.env` (agente) e no Supabase.
- O dono conecta as contas (Supabase, Vercel) e passa as chaves; o Claude escreve
  o codigo.

## Status / roadmap

- [x] Motor de cortes (agente) completo: viral multimodal, legenda, reframe, custo.
- [ ] **Fase 1**: landing 8-bit + shell web + login Supabase.  ← em andamento
- [ ] Fase 2: aba APIs (salvar chave OpenRouter, RLS/cripto).
- [ ] Fase 3: jobs + agente local conectado ao Supabase.
- [ ] Fase 4: biblioteca de clipes + progresso realtime.
- [ ] Fase 5: assinatura (Stripe/Mercado Pago).
- [ ] Fase 6: empacotar/instalar o agente + onboarding.

## Comandos

```bash
# agente (motor de cortes)
cd agent && make setup && make test

# web
cd web && npm install && npm run dev   # http://localhost:3000
```
