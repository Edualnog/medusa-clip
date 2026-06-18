# Guia de montagem — Medusa Cut (SaaS)

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

## 3) VPS — o worker  ⏳ (Fase 3)

Quando a Fase 3 estiver pronta, o passo a passo será (eu te guio ao vivo):
1. Crie a VPS (Ubuntu 22.04+) na Hostinger (KVM 2 ou 4).
2. Instale Docker: `curl -fsSL https://get.docker.com | sh`.
3. Eu te entrego um `agent/Dockerfile` + `docker-compose.yml`. Você cria um
   `.env` no servidor com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `KEY_ENCRYPTION_SECRET`.
4. `docker compose up -d` → o worker fica rodando, escutando a fila de jobs.
5. Storage dos clipes: bucket no Supabase Storage (eu configuro as policies).

**Limites pra proteger a VPS:** 1 job por vez (KVM 2) / ~2 (KVM 4), via fila.
Limpa os temporários a cada job. Sobe só o resultado pro Storage.

---

## Ordem recomendada

1. Supabase: rodar `0001` + pegar as chaves. ✅ (você faz isso agora)
2. Web local funcionando (salvar a chave da OpenRouter na aba Chaves API).
3. **Fase 3** (eu codo): jobs + worker. Aí montamos a VPS juntos.
4. Fase 4: biblioteca + progresso. Fase 5: assinatura. Fase 6: deploy final.

> Resumo da segurança: a chave da OpenRouter do usuário fica **cifrada (AES-256)**
> no Supabase, com RLS negando acesso direto; só o servidor (web e worker, com o
> `service_role` + `KEY_ENCRYPTION_SECRET`) decifra. O navegador nunca vê o valor.
