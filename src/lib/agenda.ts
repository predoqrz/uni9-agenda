import "server-only";
import { buscarTodos } from "@/lib/supabase/buscar-todos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const STATUS = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  faltou: "Faltou",
  cancelado: "Cancelado",
} as const;
export type Status = keyof typeof STATUS;

export type AtendimentoResumo = {
  id: string;
  inicio: string;
  fim: string;
  status: Status;
  servicos_resumo: string;
  valor_cobrado_centavos: number;
  sinal_centavos: number;
  sinal_pago_em: string | null;
  cliente: { id: string; nome: string; telefone: string | null } | null;
};

const COLUNAS =
  "id, inicio, fim, status, servicos_resumo, valor_cobrado_centavos, sinal_centavos, sinal_pago_em, cliente:clientes(id, nome, telefone)";

/** Atendimentos que encostam em [de, ate), ordenados pelo início. */
export async function atendimentosEntre(de: Date, ate: Date): Promise<AtendimentoResumo[]> {
  const supabase = await criarClienteServidor();
  return buscarTodos<AtendimentoResumo>((a, b) =>
    supabase
      .from("atendimentos")
      .select(COLUNAS)
      .is("deleted_at", null)
      .lt("inicio", ate.toISOString())
      .gt("fim", de.toISOString())
      .order("inicio")
      .order("id")
      .range(a, b)
      .overrideTypes<AtendimentoResumo[], { merge: false }>(),
  );
}

/** Ocupa a agenda? Cancelado e faltou não contam para encaixe. */
export function ocupaHorario(status: Status): boolean {
  return status !== "cancelado" && status !== "faltou";
}
