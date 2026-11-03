-- 0002: atendimentos (agenda) e seus procedimentos.
-- Encaixe de horário não é proibido no banco: o app avisa e deixa marcar mesmo assim.

create table public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  servico_id uuid references public.servicos (id),  -- serviço principal (o primeiro da lista)
  inicio timestamptz not null,
  fim timestamptz not null,
  status text not null default 'agendado'
    check (status in ('agendado', 'confirmado', 'realizado', 'faltou', 'cancelado')),
  valor_cobrado_centavos bigint not null default 0 check (valor_cobrado_centavos >= 0),  -- já com desconto
  desconto_centavos bigint not null default 0 check (desconto_centavos >= 0),
  servicos_resumo text not null default '',  -- "Volume brasileiro + Design"
  custo_material_centavos bigint not null default 0 check (custo_material_centavos >= 0),
  sinal_centavos bigint not null default 0 check (sinal_centavos >= 0),
  sinal_pago_em timestamptz,
  sinal_forma text check (sinal_forma in ('pix', 'dinheiro', 'debito', 'credito')),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz,
  check (fim > inicio),
  check (fim - inicio <= interval '12 hours'),
  check ((sinal_pago_em is null) = (sinal_forma is null))
);

create index atendimentos_por_inicio on public.atendimentos (inicio) where deleted_at is null;
create index atendimentos_por_cliente on public.atendimentos (cliente_id, inicio) where deleted_at is null;

create trigger atendimentos_atualizado_em before update on public.atendimentos
  for each row execute function public.tocar_atualizado_em();

alter table public.atendimentos enable row level security;
create policy "atendimentos: tudo para quem está logado" on public.atendimentos
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.atendimentos to authenticated;

create table public.atendimento_itens (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos (id),
  servico_id uuid not null references public.servicos (id),
  valor_centavos bigint not null check (valor_centavos >= 0),
  custo_centavos bigint not null default 0 check (custo_centavos >= 0),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz
);

create index atendimento_itens_por_atendimento on public.atendimento_itens (atendimento_id, ordem)
  where deleted_at is null;

create trigger atendimento_itens_atualizado_em before update on public.atendimento_itens
  for each row execute function public.tocar_atualizado_em();

alter table public.atendimento_itens enable row level security;
create policy "atendimento_itens: tudo para quem está logado" on public.atendimento_itens
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.atendimento_itens to authenticated;

revoke all on public.atendimentos, public.atendimento_itens from anon;

-- Salva o atendimento e seus procedimentos numa transação só.
-- Os itens anteriores são arquivados (deleted_at), nunca apagados.
-- Os totais são recalculados aqui a partir dos itens, para não confiar no navegador.
create or replace function public.salvar_atendimento(
  p_id uuid,
  p_cliente_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_desconto_centavos bigint,
  p_sinal_centavos bigint,
  p_observacoes text,
  p_itens jsonb  -- [{"servico_id": "...", "valor_centavos": 12000}, ...]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_soma bigint;
  v_custo bigint;
  v_resumo text;
  v_principal uuid;
begin
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O atendimento precisa de pelo menos um procedimento.';
  end if;

  select
    coalesce(sum((e.item->>'valor_centavos')::bigint), 0),
    coalesce(sum(s.custo_centavos), 0),
    string_agg(s.nome, ' + ' order by e.ord),
    (array_agg(s.id order by e.ord))[1]
  into v_soma, v_custo, v_resumo, v_principal
  from jsonb_array_elements(p_itens) with ordinality as e(item, ord)
  join public.servicos s on s.id = (e.item->>'servico_id')::uuid;

  if v_principal is null then
    raise exception 'Serviço não encontrado.';
  end if;
  if p_desconto_centavos > v_soma then
    raise exception 'O desconto não pode passar do total.';
  end if;

  if v_id is null then
    insert into public.atendimentos (
      cliente_id, servico_id, inicio, fim, valor_cobrado_centavos, desconto_centavos,
      servicos_resumo, custo_material_centavos, sinal_centavos, observacoes
    ) values (
      p_cliente_id, v_principal, p_inicio, p_fim, v_soma - p_desconto_centavos, p_desconto_centavos,
      v_resumo, v_custo, p_sinal_centavos, nullif(btrim(p_observacoes), '')
    ) returning id into v_id;
  else
    update public.atendimentos set
      cliente_id = p_cliente_id,
      servico_id = v_principal,
      inicio = p_inicio,
      fim = p_fim,
      valor_cobrado_centavos = v_soma - p_desconto_centavos,
      desconto_centavos = p_desconto_centavos,
      servicos_resumo = v_resumo,
      custo_material_centavos = v_custo,
      sinal_centavos = p_sinal_centavos,
      observacoes = nullif(btrim(p_observacoes), '')
    where id = v_id and deleted_at is null;
    if not found then
      raise exception 'Atendimento não encontrado.';
    end if;
    update public.atendimento_itens set deleted_at = now()
    where atendimento_id = v_id and deleted_at is null;
  end if;

  insert into public.atendimento_itens (atendimento_id, servico_id, valor_centavos, custo_centavos, ordem)
  select v_id, s.id, (e.item->>'valor_centavos')::bigint, s.custo_centavos, e.ord::int
  from jsonb_array_elements(p_itens) with ordinality as e(item, ord)
  join public.servicos s on s.id = (e.item->>'servico_id')::uuid;

  return v_id;
end;
$$;

revoke all on function public.salvar_atendimento from public, anon;
grant execute on function public.salvar_atendimento to authenticated;
