-- 0005: regras do Checklist de WhatsApp (lembretes) e os contatos feitos.
-- O app não envia nada sozinho: monta a lista e abre o WhatsApp com o texto pronto.

create table public.lembretes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) > 0),
  tipo text not null check (tipo in ('retorno', 'pos_atendimento', 'confirmacao', 'aniversario')),
  mensagem text not null check (length(btrim(mensagem)) > 0),
  ativo boolean not null default true,
  ordem integer not null default 0,
  -- retorno: N dias depois do último realizado; pós: N dias depois; confirmação e aniversário: N dias antes
  dias integer not null default 0 check (dias between 0 and 730),
  -- só retorno
  categorias text[] not null default '{}',
  avisar_antes integer not null default 0 check (avisar_antes between 0 and 365),
  mensagem_atrasada text,            -- texto diferente depois do prazo
  limite_manutencoes integer check (limite_manutencoes between 1 and 50),  -- ex.: 3 → a 4ª vira nova colocação
  mensagem_nova_colocacao text,
  sumir_apos integer check (sumir_apos between 1 and 730),  -- some N dias depois do prazo
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger lembretes_atualizado_em before update on public.lembretes
  for each row execute function public.tocar_atualizado_em();

alter table public.lembretes enable row level security;
create policy "lembretes: tudo para quem está logado" on public.lembretes
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.lembretes to authenticated;

create table public.contatos (
  id uuid primary key default gen_random_uuid(),
  lembrete_id uuid not null references public.lembretes (id),
  cliente_id uuid not null references public.clientes (id),
  referencia text not null,  -- a ocasião: id do atendimento, ano do aniversário…
  feito_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index contatos_um_por_ocasiao on public.contatos (lembrete_id, cliente_id, referencia)
  where deleted_at is null;

create trigger contatos_atualizado_em before update on public.contatos
  for each row execute function public.tocar_atualizado_em();

alter table public.contatos enable row level security;
create policy "contatos: tudo para quem está logado" on public.contatos
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.contatos to authenticated;

revoke all on public.lembretes, public.contatos from anon;

-- Lembretes iniciais de exemplo (100% editáveis).
insert into public.lembretes (nome, tipo, mensagem, ordem, dias, categorias, avisar_antes, mensagem_atrasada, limite_manutencoes, mensagem_nova_colocacao, sumir_apos) values
  ('Retorno de extensão de cílios', 'retorno',
   'Oi, {nome}! Já está chegando a hora da manutenção dos seus cílios (até {prazo}). Quer que eu reserve um horário pra você?',
   1, 21, '{extensao_cilios}', 7,
   'Oi, {nome}! Seus cílios já passaram do prazo da manutenção ({prazo}). Ainda dá pra recuperar: quer marcar?',
   3, 'Oi, {nome}! Depois de algumas manutenções, o ideal agora é uma nova colocação dos cílios. Quer agendar?', 30),
  ('Retorno de design', 'retorno',
   'Oi, {nome}! Já faz um tempinho do seu design de sobrancelhas. Quer marcar o próximo até {prazo}?',
   2, 25, '{design,sobrancelhas}', 5, null, null, null, 30),
  ('Confirmação de horário', 'confirmacao',
   'Oi, {nome}! Confirmando seu horário de {servico} em {data} às {hora}. Posso contar com você?',
   3, 1, '{}', 0, null, null, null, null),
  ('Pós-atendimento', 'pos_atendimento',
   'Oi, {nome}! Como estão seus {servico}? Qualquer coisa, me chama por aqui. 💛',
   4, 2, '{}', 0, null, null, null, null),
  ('Aniversário', 'aniversario',
   'Feliz aniversário, {nome}! 🎉 Que seu dia seja lindo. Tem um mimo te esperando no próximo atendimento!',
   5, 0, '{}', 0, null, null, null, null);
