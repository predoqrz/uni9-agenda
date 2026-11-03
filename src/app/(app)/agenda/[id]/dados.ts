import "server-only";
import type { Status } from "@/lib/agenda";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type AtendimentoCompleto = {
  id: string;
  inicio: string;
  fim: string;
  status: Status;
  servicos_resumo: string;
  valor_cobrado_centavos: number;
  desconto_centavos: number;
  sinal_centavos: number;
  sinal_pago_em: string | null;
  sinal_forma: "pix" | "dinheiro" | "debito" | "credito" | null;
  observacoes: string | null;
  cliente: { id: string; nome: string; telefone: string | null } | null;
  itens: { id: string; servico_id: string; valor_centavos: number; ordem: number; deleted_at: string | null; servico: { nome: string } | null }[];
};

export async function carregarAtendimento(id: string): Promise<AtendimentoCompleto | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("atendimentos")
    .select(
      "id, inicio, fim, status, servicos_resumo, valor_cobrado_centavos, desconto_centavos, sinal_centavos, sinal_pago_em, sinal_forma, observacoes, cliente:clientes(id, nome, telefone), itens:atendimento_itens(id, servico_id, valor_centavos, ordem, deleted_at, servico:servicos(nome))",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<AtendimentoCompleto, { merge: false }>();
  if (!data) return null;
  return { ...data, itens: data.itens.filter((i) => !i.deleted_at).sort((a, b) => a.ordem - b.ordem) };
}
