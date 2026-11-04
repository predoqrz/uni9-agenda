import "server-only";
import { montarChecklist, type AtendimentoChecklist, type ClienteChecklist, type ContatoFeito, type Lembrete } from "@/lib/checklist";
import { buscarTodos } from "@/lib/supabase/buscar-todos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { hoje, instante, somarDias } from "@/lib/tempo";

type AtendimentoBruto = Omit<AtendimentoChecklist, "itens"> & {
  itens: { deleted_at: string | null; servico: { categoria: string; e_manutencao: boolean } | null }[];
};

const COLUNAS_LEMBRETE =
  "id, nome, tipo, mensagem, ativo, ordem, dias, categorias, avisar_antes, mensagem_atrasada, limite_manutencoes, mensagem_nova_colocacao, sumir_apos";

export async function carregarLembretes(): Promise<Lembrete[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("lembretes")
    .select(COLUNAS_LEMBRETE)
    .is("deleted_at", null)
    .order("ordem")
    .overrideTypes<Lembrete[], { merge: false }>();
  return data ?? [];
}

/** Carrega tudo o que o checklist precisa e monta a lista de hoje. */
export async function checklistDeHoje() {
  const supabase = await criarClienteServidor();
  const dia = hoje();
  const [lembretes, clientes, brutos, contatos] = await Promise.all([
    carregarLembretes(),
    buscarTodos<ClienteChecklist>((a, b) =>
      supabase.from("clientes").select("id, nome, telefone, nascimento").is("deleted_at", null).order("nome").order("id").range(a, b),
    ),
    buscarTodos<AtendimentoBruto>((a, b) =>
      supabase
        .from("atendimentos")
        .select("id, cliente_id, inicio, fim, status, servicos_resumo, itens:atendimento_itens(deleted_at, servico:servicos(categoria, e_manutencao))")
        .is("deleted_at", null)
        .in("status", ["realizado", "agendado", "confirmado"])
        .order("inicio")
        .order("id")
        .range(a, b)
        .overrideTypes<AtendimentoBruto[], { merge: false }>(),
    ),
    // Contatos dos últimos 2 anos bastam para marcar o que já foi feito.
    buscarTodos<ContatoFeito>((a, b) =>
      supabase
        .from("contatos")
        .select("id, lembrete_id, cliente_id, referencia")
        .is("deleted_at", null)
        .gte("feito_em", instante(somarDias(dia, -730)).toISOString())
        .order("id")
        .range(a, b),
    ),
  ]);

  const atendimentos: AtendimentoChecklist[] = brutos.map((a) => ({
    ...a,
    itens: a.itens.filter((i) => !i.deleted_at && i.servico).map((i) => ({ categoria: i.servico!.categoria, e_manutencao: i.servico!.e_manutencao })),
  }));
  return { lembretes, itens: montarChecklist(lembretes, clientes, atendimentos, contatos, dia, new Date().toISOString()) };
}
