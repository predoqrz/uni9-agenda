"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { atendimentosEntre, ocupaHorario, STATUS, type Status } from "@/lib/agenda";
import { conflitosDeHorario, lerDinheiro } from "@/lib/nucleo";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { eData, emMinutos, instante, partes } from "@/lib/tempo";

export type Conflito = { id: string; nome: string; inicio: string; fim: string; servicos: string };
export type EstadoAtendimento = { erro?: string; conflitos?: Conflito[]; rodada?: number } | undefined;

const dinheiro = z.string().transform((t, ctx) => {
  if (!t.trim()) return 0;
  const r = lerDinheiro(t);
  if (!r.ok) {
    ctx.addIssue({ code: "custom", message: r.erro });
    return z.NEVER;
  }
  return r.centavos;
});

const esquema = z.object({
  cliente_id: z.string().uuid("Escolha a cliente."),
  data: z.string().refine(eData, "Escolha a data."),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Escolha o horário."),
  duracao_min: z.coerce.number().int().min(5, "Duração mínima: 5 minutos.").max(720, "Duração máxima: 12 horas."),
  itens: z
    .array(z.object({ servico_id: z.string().uuid(), valor: dinheiro }))
    .min(1, "Escolha pelo menos um procedimento.")
    .max(20),
  desconto: dinheiro,
  sinal: dinheiro,
  observacoes: z.string().max(2000),
  forcar: z.boolean(),
});

export async function salvarAtendimento(
  id: string | null,
  anterior: EstadoAtendimento,
  dados: FormData,
): Promise<EstadoAtendimento> {
  const rodada = (anterior?.rodada ?? 0) + 1;
  let itens: unknown = [];
  try {
    itens = JSON.parse(String(dados.get("itens") ?? "[]"));
  } catch {
    return { erro: "Procedimentos inválidos.", rodada };
  }
  const validado = esquema.safeParse({
    cliente_id: String(dados.get("cliente_id") ?? ""),
    data: String(dados.get("data") ?? ""),
    hora: String(dados.get("hora") ?? ""),
    duracao_min: String(dados.get("duracao_min") ?? ""),
    itens,
    desconto: String(dados.get("desconto") ?? ""),
    sinal: String(dados.get("sinal") ?? ""),
    observacoes: String(dados.get("observacoes") ?? ""),
    forcar: dados.get("forcar") === "1",
  });
  if (!validado.success) {
    const i = validado.error.issues[0];
    const onde = i.path[0] === "itens" && i.path.length > 1 ? "Valor de procedimento: " : "";
    return { erro: onde + i.message, rodada };
  }
  const d = validado.data;
  const soma = d.itens.reduce((s, i) => s + i.valor, 0);
  if (d.desconto > soma) return { erro: "O desconto não pode passar do total.", rodada };

  const inicio = instante(d.data, d.hora);
  const fim = new Date(inicio.getTime() + d.duracao_min * 60_000);

  // Avisa, nunca bloqueia: com encaixe, volta para a pessoa decidir.
  if (!d.forcar) {
    const vizinhos = (await atendimentosEntre(new Date(inicio.getTime() - 12 * 3600_000), new Date(fim.getTime() + 12 * 3600_000)))
      .filter((a) => a.id !== id && ocupaHorario(a.status))
      .slice(0, 128);
    const indices = conflitosDeHorario(
      { inicio: emMinutos(inicio), fim: emMinutos(fim) },
      vizinhos.map((a) => ({ inicio: emMinutos(a.inicio), fim: emMinutos(a.fim) })),
    );
    if (indices.length) {
      return {
        rodada,
        conflitos: indices.map((i) => {
          const a = vizinhos[i];
          return {
            id: a.id,
            nome: a.cliente?.nome ?? "Cliente arquivada",
            inicio: partes(a.inicio).hora,
            fim: partes(a.fim).hora,
            servicos: a.servicos_resumo,
          };
        }),
      };
    }
  }

  const supabase = await criarClienteServidor();
  const { data: novoId, error } = await supabase.rpc("salvar_atendimento", {
    p_id: id,
    p_cliente_id: d.cliente_id,
    p_inicio: inicio.toISOString(),
    p_fim: fim.toISOString(),
    p_desconto_centavos: d.desconto,
    p_sinal_centavos: d.sinal,
    p_observacoes: d.observacoes,
    p_itens: d.itens.map((i) => ({ servico_id: i.servico_id, valor_centavos: i.valor })),
  });
  if (error || !novoId) return { erro: error?.message ?? "Não deu para salvar agora.", rodada };

  revalidatePath("/agenda", "layout");
  redirect(`/agenda/${novoId}`);
}

export async function mudarStatus(id: string, status: Status) {
  if (!(status in STATUS)) return;
  const supabase = await criarClienteServidor();
  await supabase.from("atendimentos").update({ status }).eq("id", id).is("deleted_at", null);
  revalidatePath("/agenda", "layout");
}

const FORMAS = ["pix", "dinheiro", "debito", "credito"] as const;
export type FormaPagamento = (typeof FORMAS)[number];

export async function registrarSinal(id: string, forma: FormaPagamento | null) {
  if (forma !== null && !FORMAS.includes(forma)) return;
  const supabase = await criarClienteServidor();
  await supabase
    .from("atendimentos")
    .update({ sinal_forma: forma, sinal_pago_em: forma ? new Date().toISOString() : null })
    .eq("id", id)
    .is("deleted_at", null);
  revalidatePath("/agenda", "layout");
}

export async function arquivarAtendimento(id: string, data: string) {
  const supabase = await criarClienteServidor();
  await supabase.from("atendimentos").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/agenda", "layout");
  redirect(`/agenda/dia?data=${eData(data) ? data : ""}`);
}
