"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FORMAS_PAGAMENTO, type FormaPagamento } from "@/lib/caixa";
import { lerDinheiro } from "@/lib/nucleo";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { eData } from "@/lib/tempo";

const valor = z.string().transform((t, ctx) => {
  const r = lerDinheiro(t);
  if (!r.ok) {
    ctx.addIssue({ code: "custom", message: r.erro });
    return z.NEVER;
  }
  if (r.centavos <= 0) {
    ctx.addIssue({ code: "custom", message: "O valor precisa ser maior que zero." });
    return z.NEVER;
  }
  return r.centavos;
});
const esfera = z.enum(["empresa", "pessoal"], { message: "Escolha empresa ou pessoal." });
const formas = Object.keys(FORMAS_PAGAMENTO) as [FormaPagamento, ...FormaPagamento[]];

export type EstadoForm = { erros?: Record<string, string>; valores?: Record<string, string> } | undefined;

function errosDe(issues: z.core.$ZodIssue[]) {
  const erros: Record<string, string> = {};
  for (const i of issues) erros[String(i.path[0])] ??= i.message;
  return erros;
}

const esquemaLancamento = z
  .object({
    tipo: z.enum(["entrada", "saida", "transferencia"]),
    esfera,
    esfera_origem: z.string(),
    valor,
    data: z.string().refine(eData, "Escolha a data."),
    descricao: z.string().trim().max(200),
    categoria: z.string().trim().max(60),
    forma_pagamento: z.union([z.enum(formas), z.literal("")]),
  })
  .superRefine((v, ctx) => {
    if (v.tipo === "transferencia" && v.esfera_origem === v.esfera) {
      ctx.addIssue({ code: "custom", path: ["esfera"], message: "Escolha esferas diferentes para transferir." });
    }
  });

export async function salvarLancamento(id: string | null, _anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const valores = Object.fromEntries(
    ["tipo", "esfera", "esfera_origem", "valor", "data", "descricao", "categoria", "forma_pagamento"].map((k) => [k, String(dados.get(k) ?? "")]),
  );
  const v = esquemaLancamento.safeParse(valores);
  if (!v.success) return { erros: errosDe(v.error.issues), valores };
  const d = v.data;
  const transferencia = d.tipo === "transferencia";
  const linha = {
    tipo: d.tipo,
    esfera: d.esfera,
    esfera_origem: transferencia ? (d.esfera === "empresa" ? "pessoal" : "empresa") : null,
    valor_centavos: d.valor,
    data: d.data,
    descricao: d.descricao || (transferencia ? "Transferência" : ""),
    categoria: d.categoria,
    forma_pagamento: d.forma_pagamento || null,
  };
  const supabase = await criarClienteServidor();
  // Lançamentos automáticos (atendimento, sinal, conta fixa) não são editáveis por aqui.
  const { error } = id
    ? await supabase.from("lancamentos").update(linha).eq("id", id).eq("origem", "manual")
    : await supabase.from("lancamentos").insert({ ...linha, origem: "manual" });
  if (error) return { erros: { geral: "Não deu para salvar agora. Tente de novo." }, valores };
  revalidatePath("/caixa", "layout");
  redirect(`/caixa?mes=${d.data.slice(0, 7)}`);
}

export async function arquivarLancamento(id: string, data: string) {
  const supabase = await criarClienteServidor();
  // Receita e sinal de atendimento são controlados pela agenda.
  await supabase
    .from("lancamentos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .in("origem", ["manual", "recorrencia", "importacao"]);
  revalidatePath("/caixa", "layout");
  redirect(`/caixa?mes=${data.slice(0, 7)}`);
}

const esquemaRecorrencia = z.object({
  tipo: z.enum(["entrada", "saida"]),
  esfera,
  valor,
  descricao: z.string().trim().min(1, "Dê um nome à conta.").max(200),
  categoria: z.string().trim().max(60),
  dia_mes: z.coerce.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
  comeca_em: z.string().refine(eData, "Escolha a data de início."),
  ativo: z.boolean(),
});

export async function salvarRecorrencia(id: string | null, _anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const valores = Object.fromEntries(
    ["tipo", "esfera", "valor", "descricao", "categoria", "dia_mes", "comeca_em"].map((k) => [k, String(dados.get(k) ?? "")]),
  );
  const v = esquemaRecorrencia.safeParse({ ...valores, ativo: dados.get("ativo") === "on" });
  if (!v.success) return { erros: errosDe(v.error.issues), valores: { ...valores, ativo: dados.get("ativo") === "on" ? "on" : "" } };
  const { valor: valor_centavos, ...resto } = v.data;
  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("recorrencias").update({ ...resto, valor_centavos }).eq("id", id)
    : await supabase.from("recorrencias").insert({ ...resto, valor_centavos });
  if (error) return { erros: { geral: "Não deu para salvar agora. Tente de novo." }, valores };
  revalidatePath("/caixa", "layout");
  redirect("/caixa/contas-fixas");
}

export async function arquivarRecorrencia(id: string) {
  const supabase = await criarClienteServidor();
  await supabase.from("recorrencias").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/caixa", "layout");
  redirect("/caixa/contas-fixas");
}
