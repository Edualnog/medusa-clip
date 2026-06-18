-- Medusa Cut · Fase 2 — chave de API do usuario (OpenRouter), guardada com seguranca.
--
-- Seguranca:
--  * A chave e gravada CRIPTOGRAFADA (AES-256-GCM) pela camada web; aqui fica so o
--    ciphertext + os 4 ultimos digitos (pra UI mostrar "····1234").
--  * RLS LIGADO e SEM policies => nega acesso a anon/authenticated. So o
--    service_role (server-side) acessa, via rotas que checam a sessao do usuario.
--  * O navegador NUNCA le a chave de volta.

create table if not exists public.user_api_keys (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  provider   text not null default 'openrouter',
  key_cipher text not null,                 -- iv:tag:ciphertext (base64), AES-256-GCM
  key_last4  text not null,                 -- so pra exibir mascarado
  updated_at timestamptz not null default now()
);

alter table public.user_api_keys enable row level security;
-- Proposital: NENHUMA policy. Com RLS ligado, isso NEGA tudo pra anon/authenticated.
-- Apenas o service_role (que ignora RLS) acessa, pelas rotas /api/keys do servidor.

-- mantem updated_at coerente
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_api_keys_touch on public.user_api_keys;
create trigger trg_user_api_keys_touch
  before update on public.user_api_keys
  for each row execute function public.touch_updated_at();
