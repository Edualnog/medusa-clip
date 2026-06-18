-- Fase 4: progresso realtime na web.
-- Habilita o Supabase Realtime nas tabelas que a UI escuta (jobs + clips).
-- RLS continua valendo: o cliente so recebe eventos das proprias linhas
-- (policies jobs_select_own / clips_select_own do 0002).
--
-- REPLICA IDENTITY FULL: necessario pra o filtro `user_id=eq.<uid>` funcionar
-- em UPDATE/DELETE (o Postgres precisa mandar o valor da coluna do filtro).

alter table public.jobs  replica identity full;
alter table public.clips replica identity full;

-- adiciona na publication do realtime (idempotente — nao quebra se ja existir)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clips'
  ) then
    alter publication supabase_realtime add table public.clips;
  end if;
end $$;
