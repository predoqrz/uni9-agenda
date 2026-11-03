-- 0001: base comum + clientes + serviços.
-- Regras: nada é apagado (deleted_at), dinheiro em centavos inteiros, RLS só para quem está logado.

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- Clientes ---------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) > 0),
  telefone text check (telefone ~ '^[0-9]{10,11}$'),  -- só dígitos, com DDD
  nascimento date,
  rede_social text,
  observacoes text,  -- preferências; sem dado de saúde
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz
);

-- Um telefone por cliente ativa (arquivadas não contam).
create unique index clientes_telefone_unico on public.clientes (telefone)
  where deleted_at is null and telefone is not null;
create index clientes_ativas on public.clientes (nome) where deleted_at is null;

create trigger clientes_atualizado_em before update on public.clientes
  for each row execute function public.tocar_atualizado_em();

alter table public.clientes enable row level security;
create policy "clientes: tudo para quem está logado" on public.clientes
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.clientes to authenticated;
-- Nada para anon. Nunca.

-- Serviços ---------------------------------------------------------------
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) > 0),
  preco_centavos bigint not null default 0 check (preco_centavos >= 0),
  duracao_min integer not null default 60 check (duracao_min > 0 and duracao_min <= 720),
  ativo boolean not null default true,
  categoria text not null default 'outros' check (categoria in
    ('extensao_cilios', 'design', 'sobrancelhas', 'cilios', 'labios', 'facial', 'outros')),
  e_manutencao boolean not null default false,
  sinal_centavos bigint not null default 0 check (sinal_centavos >= 0),
  custo_centavos bigint not null default 0 check (custo_centavos >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz
);

create index servicos_ativos on public.servicos (categoria, nome) where deleted_at is null;

create trigger servicos_atualizado_em before update on public.servicos
  for each row execute function public.tocar_atualizado_em();

alter table public.servicos enable row level security;
create policy "servicos: tudo para quem está logado" on public.servicos
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.servicos to authenticated;
-- Nada para anon. Nunca.

-- O Supabase concede tudo a anon por padrão em tabelas novas; tiramos explicitamente.
revoke all on public.clientes, public.servicos from anon;
