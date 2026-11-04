-- 0004: biblioteca livre de mensagens prontas (título + texto), editável pela profissional.
-- Marcadores aceitos no texto: {nome} (primeiro nome), {servico}, {data}, {hora}.

create table public.mensagens_prontas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(btrim(titulo)) > 0),
  texto text not null check (length(btrim(texto)) > 0),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger mensagens_prontas_atualizado_em before update on public.mensagens_prontas
  for each row execute function public.tocar_atualizado_em();

alter table public.mensagens_prontas enable row level security;
create policy "mensagens_prontas: tudo para quem está logado" on public.mensagens_prontas
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.mensagens_prontas to authenticated;
revoke all on public.mensagens_prontas from anon;

-- Exemplos para começar (editáveis).
insert into public.mensagens_prontas (titulo, texto, ordem) values
  ('Boas-vindas', 'Oi, {nome}! Que bom ter você por aqui. Qualquer dúvida sobre o atendimento, é só me chamar. 💛', 1),
  ('Lembrete de horário', 'Oi, {nome}! Passando para lembrar do seu horário de {servico} em {data} às {hora}. Posso confirmar?', 2),
  ('Cuidados pós-atendimento', 'Oi, {nome}! Nas primeiras 24 horas evite molhar e usar maquiagem na região. Qualquer coisa, me chama!', 3);
