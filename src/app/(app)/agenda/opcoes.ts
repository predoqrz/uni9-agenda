import "server-only";
import { buscarTodos } from "@/lib/supabase/buscar-todos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { OpcaoCliente, OpcaoServico } from "./formulario-atendimento";

/** Clientes ativas e serviços ativos para o formulário de atendimento. */
export async function carregarOpcoes(): Promise<{ clientes: OpcaoCliente[]; servicos: OpcaoServico[] }> {
  const supabase = await criarClienteServidor();
  const [clientes, servicos] = await Promise.all([
    buscarTodos<OpcaoCliente>((de, ate) =>
      supabase.from("clientes").select("id, nome, telefone").is("deleted_at", null).order("nome").order("id").range(de, ate),
    ),
    buscarTodos<OpcaoServico>((de, ate) =>
      supabase
        .from("servicos")
        .select("id, nome, preco_centavos, duracao_min, sinal_centavos")
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome")
        .range(de, ate),
    ),
  ]);
  return { clientes, servicos };
}
