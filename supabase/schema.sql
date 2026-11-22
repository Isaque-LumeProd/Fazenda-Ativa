-- Fazenda Ativa: esquema do banco na nuvem (Supabase / Postgres)
--
-- Como usar: no painel do Supabase, abra "SQL Editor", cole este arquivo inteiro e clique em "Run".
-- Pode rodar de novo sem problema: tudo é criado com "if not exists" / "or replace".
--
-- Modelo:
--   fazendas   uma fazenda (com código de convite)
--   membros    quem participa de cada fazenda: 'dono' ou 'funcionario'
--   registros  todos os dados do app (galinheiros, lotes, manejos, itens, movimentos, tarefas)
--              guardados como JSON, um por linha. Exclusão vira "excluido = true" para que os
--              outros aparelhos fiquem sabendo. "rev" cresce a cada mudança e é usado para
--              baixar só o que mudou desde a última sincronização.

-- ---------------------------------------------------------------- tabelas

create table if not exists public.fazendas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 1 and 80),
  codigo_convite text not null unique,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid()
);

create table if not exists public.membros (
  fazenda_id uuid not null references public.fazendas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null check (papel in ('dono', 'funcionario')),
  nome text not null default '',
  criado_em timestamptz not null default now(),
  primary key (fazenda_id, user_id)
);
create index if not exists membros_user_idx on public.membros (user_id);

create sequence if not exists public.registros_rev;

create table if not exists public.registros (
  fazenda_id uuid not null references public.fazendas (id) on delete cascade,
  colecao text not null check (colecao in ('galinheiros', 'lotes', 'manejos', 'itens', 'movimentos', 'tarefas')),
  id text not null check (length(id) between 1 and 64),
  dados jsonb not null default '{}'::jsonb,
  excluido boolean not null default false,
  rev bigint not null default nextval('public.registros_rev'),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  primary key (fazenda_id, colecao, id)
);
create index if not exists registros_rev_idx on public.registros (fazenda_id, rev);

-- Toda alteração ganha um "rev" novo, carimbo de hora do servidor e autor.
create or replace function public.registros_carimbar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.rev := nextval('public.registros_rev');
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end;
$$;

drop trigger if exists registros_carimbar on public.registros;
create trigger registros_carimbar
  before insert or update on public.registros
  for each row execute function public.registros_carimbar();

-- ---------------------------------------------------------------- funções de apoio

-- "security definer" para poder ler membros sem cair na própria regra de segurança (recursão).
create or replace function public.meu_papel(f uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select papel from public.membros where fazenda_id = f and user_id = auth.uid();
$$;

create or replace function public.eh_membro(f uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.membros where fazenda_id = f and user_id = auth.uid());
$$;

-- Dono pode tudo. Funcionário registra manejos, movimentos de estoque e tarefas, mas não apaga
-- nada e não altera galinheiros, lotes nem itens de estoque.
create or replace function public.pode_gravar(f uuid, c text, exc boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.meu_papel(f)
    when 'dono' then true
    when 'funcionario' then c in ('manejos', 'movimentos', 'tarefas') and not exc
    else false
  end;
$$;

create or replace function public.gerar_codigo()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem 0/O, 1/I
  codigo text;
begin
  loop
    codigo := '';
    for i in 1..6 loop
      codigo := codigo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.fazendas where codigo_convite = codigo);
  end loop;
  return codigo;
end;
$$;

-- ---------------------------------------------------------------- ações (chamadas pelo app)

create or replace function public.criar_fazenda(nome_fazenda text, meu_nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  nova uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso entrar na conta' using errcode = '42501';
  end if;
  insert into public.fazendas (nome, codigo_convite, criado_por)
  values (trim(nome_fazenda), public.gerar_codigo(), auth.uid())
  returning id into nova;
  insert into public.membros (fazenda_id, user_id, papel, nome)
  values (nova, auth.uid(), 'dono', coalesce(trim(meu_nome), ''));
  return nova;
end;
$$;

create or replace function public.entrar_fazenda(codigo text, meu_nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  alvo uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso entrar na conta' using errcode = '42501';
  end if;
  select id into alvo from public.fazendas where codigo_convite = upper(trim(codigo));
  if alvo is null then
    raise exception 'Código de convite não encontrado' using errcode = 'P0002';
  end if;
  insert into public.membros (fazenda_id, user_id, papel, nome)
  values (alvo, auth.uid(), 'funcionario', coalesce(trim(meu_nome), ''))
  on conflict (fazenda_id, user_id) do nothing;
  return alvo;
end;
$$;

create or replace function public.novo_codigo_convite(f uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  codigo text;
begin
  if public.meu_papel(f) is distinct from 'dono' then
    raise exception 'Só o dono pode trocar o código' using errcode = '42501';
  end if;
  codigo := public.gerar_codigo();
  update public.fazendas set codigo_convite = codigo where id = f;
  return codigo;
end;
$$;

revoke all on function public.criar_fazenda(text, text) from public, anon;
revoke all on function public.entrar_fazenda(text, text) from public, anon;
revoke all on function public.novo_codigo_convite(uuid) from public, anon;
grant execute on function public.criar_fazenda(text, text) to authenticated;
grant execute on function public.entrar_fazenda(text, text) to authenticated;
grant execute on function public.novo_codigo_convite(uuid) to authenticated;

-- ---------------------------------------------------------------- segurança por linha (RLS)

alter table public.fazendas enable row level security;
alter table public.membros enable row level security;
alter table public.registros enable row level security;

drop policy if exists fazendas_ler on public.fazendas;
create policy fazendas_ler on public.fazendas
  for select to authenticated using (public.eh_membro(id));

drop policy if exists fazendas_editar on public.fazendas;
create policy fazendas_editar on public.fazendas
  for update to authenticated
  using (public.meu_papel(id) = 'dono')
  with check (public.meu_papel(id) = 'dono');

drop policy if exists membros_ler on public.membros;
create policy membros_ler on public.membros
  for select to authenticated using (public.eh_membro(fazenda_id));

-- O dono remove funcionários; qualquer funcionário pode sair da fazenda. O dono não se remove.
drop policy if exists membros_remover on public.membros;
create policy membros_remover on public.membros
  for delete to authenticated
  using (
    papel <> 'dono'
    and (user_id = auth.uid() or public.meu_papel(fazenda_id) = 'dono')
  );

drop policy if exists registros_ler on public.registros;
create policy registros_ler on public.registros
  for select to authenticated using (public.eh_membro(fazenda_id));

drop policy if exists registros_inserir on public.registros;
create policy registros_inserir on public.registros
  for insert to authenticated
  with check (public.pode_gravar(fazenda_id, colecao, excluido));

drop policy if exists registros_atualizar on public.registros;
create policy registros_atualizar on public.registros
  for update to authenticated
  using (public.eh_membro(fazenda_id))
  with check (public.pode_gravar(fazenda_id, colecao, excluido));

-- Sem política de DELETE: linhas nunca são apagadas pelo app (usa "excluido").

-- Os campos de controle são preenchidos pelo servidor.
revoke insert, update on public.registros from anon, authenticated;
grant select on public.registros to authenticated;
grant insert (fazenda_id, colecao, id, dados, excluido) on public.registros to authenticated;
-- O "upsert" do app reescreve as colunas da chave com os mesmos valores, por isso elas entram aqui.
grant update (fazenda_id, colecao, id, dados, excluido) on public.registros to authenticated;
revoke insert, update, delete on public.fazendas from anon, authenticated;
grant select on public.fazendas to authenticated;
grant update (nome) on public.fazendas to authenticated;
revoke insert, update on public.membros from anon, authenticated;
grant select, delete on public.membros to authenticated;

-- ---------------------------------------------------------------- tempo real

-- Avisa os outros aparelhos na hora em que algo muda.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registros'
     ) then
    alter publication supabase_realtime add table public.registros;
  end if;
end;
$$;
