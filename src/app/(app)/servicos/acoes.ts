"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { lerDinheiro } from "@/lib/nucleo";
import { LISTA_CATEGORIAS, type Categoria } from "@/lib/servicos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Valor digitado → centavos pelo núcleo C. Vazio vale 0 quando `opcional`.
const dinheiro = (opcional: boolean) =>
  z.string().transform((t, ctx) => {
    if (opcional && !t.trim()) return 0;
    const r = lerDinheiro(t);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.erro });
      return z.NEVER;
    }
    return r.centavos;
  });

const esquema = z.object({
  nome: z.string().trim().min(1, "Digite o nome.").max(120),
  categoria: z.enum(LISTA_CATEGORIAS as [Categoria, ...Categoria[]], { message: "Escolha a categoria." }),
  preco: dinheiro(false),
  duracao_min: z.coerce
    .number({ message: "Digite a duração em minutos." })
    .int("Use minutos inteiros.")
    .min(5, "No mínimo 5 minutos.")
    .max(720, "No máximo 12 horas."),
  sinal: dinheiro(true),
  custo: dinheiro(true),
  e_manutencao: z.boolean(),
  ativo: z.boolean(),
});

type Campos = {
  nome: string;
  categoria: string;
  preco: string;
  duracao_min: string;
  sinal: string;
  custo: string;
  e_manutencao: boolean;
  ativo: boolean;
};
export type EstadoServico =
  | { erros?: Partial<Record<keyof Campos | "geral", string>>; valores?: Campos }
  | undefined;

export async function salvarServico(
  id: string | null,
  _anterior: EstadoServico,
  dados: FormData,
): Promise<EstadoServico> {
  const valores: Campos = {
    nome: String(dados.get("nome") ?? ""),
    categoria: String(dados.get("categoria") ?? ""),
    preco: String(dados.get("preco") ?? ""),
    duracao_min: String(dados.get("duracao_min") ?? ""),
    sinal: String(dados.get("sinal") ?? ""),
    custo: String(dados.get("custo") ?? ""),
    e_manutencao: dados.get("e_manutencao") === "on",
    ativo: dados.get("ativo") === "on",
  };
  const validado = esquema.safeParse(valores);
  if (!validado.success) {
    const erros: NonNullable<EstadoServico>["erros"] = {};
    for (const i of validado.error.issues) erros[i.path[0] as keyof Campos] ??= i.message;
    return { erros, valores };
  }
  const d = validado.data;
  if (d.sinal > d.preco) return { erros: { sinal: "O sinal não pode passar do preço." }, valores };

  const linha = {
    nome: d.nome,
    categoria: d.categoria,
    preco_centavos: d.preco,
    duracao_min: d.duracao_min,
    sinal_centavos: d.sinal,
    custo_centavos: d.custo,
    e_manutencao: d.e_manutencao,
    ativo: d.ativo,
  };
  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("servicos").update(linha).eq("id", id)
    : await supabase.from("servicos").insert(linha);
  if (error) return { erros: { geral: "Não deu para salvar agora. Tente de novo." }, valores };

  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function arquivarServico(id: string) {
  const supabase = await criarClienteServidor();
  await supabase.from("servicos").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function restaurarServico(id: string) {
  const supabase = await criarClienteServidor();
  await supabase.from("servicos").update({ deleted_at: null }).eq("id", id);
  revalidatePath("/servicos");
  redirect("/servicos?arquivados=1");
}
