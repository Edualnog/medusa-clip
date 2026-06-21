# Guia de montagem — Zorothax (SaaS)

Mapa pra subir tudo. Arquitetura **Caminho A**: Vercel (site) + Supabase (dados) +
VPS (worker). Você cria as contas e cola as chaves; eu (Claude) escrevo o código e
te guio em cada passo. Itens marcados ⏳ dependem da Fase 3 (worker) — chego neles.

## As 3 peças (e o que cada uma faz)

| Peça | Faz | Custo |
|---|---|---|
| **Vercel** | hospeda o **site** (landing, login, painel). Deploy com `git push`. | grátis pra começar |
| **Supabase** | **banco + login + storage + fila de jobs**. | grátis pra começar |
| **VPS** (Hostinger KVM) | roda o **worker** que baixa/corta/renderiza o vídeo. | ~R$44–60/mês |

Segredos por lugar (NUNCA no git):
- **Navegador (público)**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Servidor web (Vercel)**: `SUPABASE_SERVICE_ROLE_KEY`, `KEY_ENCRYPTION_SECRET`.
- **Worker (VPS)**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KEY_ENCRYPTION_SECRET`
  (o mesmo da web, pra decifrar a chave do user).

---

## 1) Supabase (banco/auth)  — em andamento

1. Projeto criado em supabase.com ✅
2. **SQL Editor** → rode os arquivos de `supabase/migrations/` em ordem:
   - `0001_user_api_keys.sql` (chave de API do user, cifrada + RLS).
   - ⏳ `0002_jobs.sql` (fila de jobs + clipes) — vem na Fase 3.
3. **Authentication → Providers → Email**: pra testar rápido, desligue
   "Confirm email" (ou confirme pelo e-mail).
4. **Project Settings → API**: copie `Project URL`, `anon key` (públicas) e
   `service_role` (SECRETA — só no servidor).

## 2) Site (Next.js)

**Local (agora):** `web/.env.local` com as 4 variáveis (as 2 públicas + as 2 de
servidor). Rode `cd web && npm run dev`.

**Deploy na Vercel (quando quiser publicar):**
1. Conecte o repositório na vercel.com, root = `web/`.
2. Em **Settings → Environment Variables**, cole as MESMAS 4 variáveis.
3. Deploy. (HTTPS e CDN automáticos.)
4. **Domínio `medusaclip.com`**: Vercel → Settings → Domains → adicionar o
   domínio; a Vercel te dá os registros DNS (um `A`/`CNAME`) pra colar no painel do
   teu registrador. HTTPS sai automático.

## 3) VPS — o worker  (Fase 3)

O `agent/Dockerfile` + `docker-compose.yml` já existem. Passo a passo na VPS Ubuntu:

```bash
# 1. acessar (Hostinger te dá o IP + senha root)
ssh root@SEU_IP

# 2. instalar Docker
curl -fsSL https://get.docker.com | sh

# 3. colocar o código na VPS (escolha um):
#    (a) Git (melhor p/ atualizar depois): repo no GitHub -> git clone <url>
#    (b) rápido, do seu Mac:  rsync -av --exclude .venv --exclude out agent/ root@SEU_IP:/root/medusacut/
cd /root/medusacut          # (ou medusa-cut/agent, conforme o clone)

# 4. criar o .env do worker (cole os MESMOS 3 valores do web/.env.local)
cat > .env <<'ENV'
SUPABASE_URL=https://xukvtvggqdirvbrqqdjw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<cole>
KEY_ENCRYPTION_SECRET=<cole o mesmo do web>
ENV

# 5. subir (a 1ª build demora alguns min: instala ffmpeg + stack de ML)
docker compose up -d --build

# 6. ver os logs — deve aparecer "conectado ao Supabase; escutando a fila…"
docker compose logs -f
```

Atualizar depois: `git pull` (ou rsync de novo) + `docker compose up -d --build`.

**Notas:** 1 job por vez (KVM 2) / ~2 (KVM 4). No 1º job o whisper baixa o modelo
(fica em volume, não rebaixa). Temporários são limpos a cada job; só o clipe final
vai pro Storage.

---

## Ordem recomendada

1. Supabase: rodar `0001` + pegar as chaves (conta/auth + `legal_acceptances`).
2. App desktop: salvar a chave de IA (OpenRouter/OpenAI/Anthropic) na aba Chaves API.

> ⚠️ **Legado:** os passos abaixo sobre "jobs + worker + VPS" e "chave cifrada no
> Supabase" são do desenho **cloud abandonado** (pré local-first) — NÃO valem mais.
>
> Realidade atual: a chave de IA fica **cifrada no DISPOSITIVO do usuário** (`safeStorage`
> — Keychain/DPAPI/libsecret), **nunca** sai pro Supabase, e vai direto pro provedor.
> Não há VPS/worker; todo o processamento de vídeo é local.

---

## Distribuição + auto-update (app desktop)

> Builds **não-assinados** por enquanto (decisão atual): instalam com botão-direito →
> Abrir (Mac) / "mais informações → executar assim mesmo" (Windows). Assinatura/
> notarização entram quando houver conta Apple Developer — aí o auto-update do Mac
> liga 100%.

### Arquitetura: um único repo PÚBLICO source-available (código + releases)
- Código-fonte **e** releases: `Edualnog/medusa-cut` (**público**, source-available —
  visível pra auditoria, sem licença de uso; ver `LICENSE`).
- Os 3 lugares apontam pra cá: `desktop/package.json` (`build.publish`),
  `desktop/main.js` (`GITHUB_REPO`), `web/app/page.tsx` (`RELEASE_REPO`).

### 1. Sem pré-requisito de token
- A release sai **neste mesmo repo** via `GITHUB_TOKEN` nativo (o job `release` tem
  `permissions: contents: write`). **Não** precisa de PAT nem do secret `RELEASES_TOKEN`.

### 2. Publicar uma versão
- Subir `desktop/package.json` `version` (ex.: `0.1.8`) — é a **fonte da verdade** do updater.
- `git tag v0.1.8 && git push --tags` → o workflow `.github/workflows/release.yml` builda
  **macOS Apple Silicon (arm64)**, **Windows (x64)** e **Linux (x86_64)** nativamente e
  publica os instaladores + os feeds (`latest*.yml`) na Release deste repo.
  (macOS Intel foi descontinuado a pedido do dono — só Apple Silicon.)

### 3. Como o usuário atualiza
- **Windows/Linux**: ao abrir, o app checa a Release; se houver versão maior, mostra
  "NOVA VERSÃO vX — BAIXAR" → baixa → "REINICIE PRA INSTALAR" → reinicia já atualizado.
- **macOS (sem assinatura)**: o app **avisa** e manda **baixar no site** (não troca o
  binário sozinho — limitação do macOS p/ apps não assinados). Vira troca in-app quando assinar.
- Os botões de download da web apontam pra `releases/latest/download/MedusaClip-<os>-<arch>.<ext>`
  (nomes fixos via `artifactName` no electron-builder) — sempre a última versão.

### Build local (sem CI), no próprio SO
```bash
cd desktop && PYTHON=python3.11 bash scripts/build_app.sh   # -> desktop/dist/
```
