-- 0003: caixa (lançamentos), contas fixas e os gatilhos que ligam a agenda ao caixa.
-- Receita só conta quando o atendimento é realizado. Sinal pago entra no dia em que foi pago
-- e não é devolvido se a cliente cancelar ou faltar.

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida', 'transferencia')),
  esfera text not null check (esfera in ('empresa', 'pessoal')),  -- na transferência: para onde vai
  esfera_origem text check (esfera_origem in ('empresa', 'pessoal')),  -- só na transferência: de onde sai
  valor_centavos bigint not null check (valor_centavos > 0),
  data date not null,
  descricao text not null default '',
  categoria text not null default '',
  forma_pagamento text check (forma_pagamento in ('pix', 'dinheiro', 'debito', 'credito', 'boleto', 'outro')),
  origem text not null default 'manual' check (origem in ('atendimento', 'sinal', 'recorrencia', 'manual', 'importacao')),
  origem_id uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz,
  check ((tipo = 'transferencia') = (esfera_origem is not null)),
  check (esfera_origem is null or esfera_origem <> esfera)
);

create index lancamentos_por_data on public.lancamentos (data) where deleted_at is null;
-- Um lançamento ativo por atendimento e por sinal.
create unique index lancamentos_um_por_atendimento on public.lancamentos (origem, origem_id)
  where deleted_at is null and origem in ('atendimento', 'sinal');
-- Uma conta fixa por mês (contando as arquivadas: arquivar o mês não faz a conta voltar). date_trunc em date depende de fuso e não vale em índice (42P17):
-- "primeiro dia do mês" = data - (dia - 1).
create unique index lancamentos_recorrencia_por_mes on public.lancamentos
  (origem_id, (data - (extract(day from data)::int - 1)))
  where origem = 'recorrencia';

create trigger lancamentos_atualizado_em before update on public.lancamentos
  for each row execute function public.tocar_atualizado_em();

alter table public.lancamentos enable row level security;
create policy "lancamentos: tudo para quem está logado" on public.lancamentos
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.lancamentos to authenticated;

create table public.recorrencias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida')),
  esfera text not null check (esfera in ('empresa', 'pessoal')),
  valor_centavos bigint not null check (valor_centavos > 0),
  descricao text not null check (length(btrim(descricao)) > 0),
  categoria text not null default '',
  dia_mes integer not null check (dia_mes between 1 and 31),
  comeca_em date not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger recorrencias_atualizado_em before update on public.recorrencias
  for each row execute function public.tocar_atualizado_em();

alter table public.recorrencias enable row level security;
create policy "recorrencias: tudo para quem está logado" on public.recorrencias
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.recorrencias to authenticated;

revoke all on public.lancamentos, public.recorrencias from anon;

-- Agenda → caixa ----------------------------------------------------------
-- AFTER INSERT OR UPDATE: só lê `new` (nunca `old`, que não existe no INSERT).
create or replace function public.atendimento_no_caixa()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_nome text;
  v_receita bigint;
begin
  select nome into v_nome from public.clientes where id = new.cliente_id;

  -- Receita do atendimento: só quando realizado. Se o sinal foi pago, entra só o restante.
  v_receita := new.valor_cobrado_centavos
    - case when new.sinal_pago_em is not null then new.sinal_centavos else 0 end;

  if new.deleted_at is null and new.status = 'realizado' and v_receita > 0 then
    update public.lancamentos set
      valor_centavos = v_receita,
      data = (new.inicio at time zone 'America/Sao_Paulo')::date,
      descricao = coalesce(v_nome, 'Cliente') || ' · ' || new.servicos_resumo
    where origem = 'atendimento' and origem_id = new.id and deleted_at is null;
    if not found then
      insert into public.lancamentos (tipo, esfera, valor_centavos, data, descricao, categoria, origem, origem_id)
      values ('entrada', 'empresa', v_receita, (new.inicio at time zone 'America/Sao_Paulo')::date,
        coalesce(v_nome, 'Cliente') || ' · ' || new.servicos_resumo, 'Atendimentos', 'atendimento', new.id);
    end if;
  else
    -- Desfazer o "realizado" arquiva a receita (nada é apagado).
    update public.lancamentos set deleted_at = now()
    where origem = 'atendimento' and origem_id = new.id and deleted_at is null;
  end if;

  -- Sinal: entra quando é pago e fica mesmo se a cliente cancelar ou faltar.
  if new.deleted_at is null and new.sinal_pago_em is not null and new.sinal_centavos > 0 then
    update public.lancamentos set
      valor_centavos = new.sinal_centavos,
      data = (new.sinal_pago_em at time zone 'America/Sao_Paulo')::date,
      forma_pagamento = new.sinal_forma,
      descricao = 'Sinal · ' || coalesce(v_nome, 'Cliente')
    where origem = 'sinal' and origem_id = new.id and deleted_at is null;
    if not found then
      insert into public.lancamentos (tipo, esfera, valor_centavos, data, descricao, categoria, forma_pagamento, origem, origem_id)
      values ('entrada', 'empresa', new.sinal_centavos, (new.sinal_pago_em at time zone 'America/Sao_Paulo')::date,
        'Sinal · ' || coalesce(v_nome, 'Cliente'), 'Sinais', new.sinal_forma, 'sinal', new.id);
    end if;
  else
    update public.lancamentos set deleted_at = now()
    where origem = 'sinal' and origem_id = new.id and deleted_at is null;
  end if;

  return null;
end;
$$;

create trigger atendimentos_no_caixa after insert or update on public.atendimentos
  for each row execute function public.atendimento_no_caixa();

-- Contas fixas → lançamentos -----------------------------------------------
-- Cria os lançamentos dos meses que já venceram até `p_ate` (inclusive), sem duplicar.
-- Meses futuros não viram lançamento: o app mostra como previsão.
create or replace function public.gerar_recorrencias(p_ate date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_criados integer;
begin
  with meses as (
    select r.*, m::date as mes
    from public.recorrencias r
    cross join lateral generate_series(
      (r.comeca_em - (extract(day from r.comeca_em)::int - 1)),
      (p_ate - (extract(day from p_ate)::int - 1)),
      interval '1 month'
    ) as m
    where r.deleted_at is null and r.ativo
  ),
  vencimentos as (
    select *, (mes + (least(dia_mes, extract(day from (mes + interval '1 month' - interval '1 day'))::int) - 1))::date as vence
    from meses
  )
  insert into public.lancamentos (tipo, esfera, valor_centavos, data, descricao, categoria, origem, origem_id)
  select tipo, esfera, valor_centavos, vence, descricao, categoria, 'recorrencia', id
  from vencimentos
  where vence <= p_ate and vence >= comeca_em
  on conflict (origem_id, (data - (extract(day from data)::int - 1)))
    where origem = 'recorrencia'
  do nothing;
  get diagnostics v_criados = row_count;
  return v_criados;
end;
$$;

revoke all on function public.gerar_recorrencias from public, anon;
grant execute on function public.gerar_recorrencias to authenticated;
revoke all on function public.atendimento_no_caixa from public, anon;
