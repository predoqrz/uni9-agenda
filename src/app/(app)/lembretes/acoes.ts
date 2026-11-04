"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Lembrete, TipoLembrete } from "@/lib/checklist";
import { LISTA_CATEGORIAS, type Categoria } from "@/lib/servicos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type EstadoLembrete = { erros?: Record<string, string>; valores?: Lembrete } | undefined;

const inteiro = (min: number, max: number, rotulo: string) =>
  z.coerce.number({ message: `Digite ${rotulo}.` }).int(`Use um número inteiro em ${rotulo}.`).min(min, `${rotulo}: no mínimo ${min}.`).max(max, `${rotulo}: no máximo ${max}.`);
const opcional = (min: number, max: number, rotulo: string) =>
  z.string().transform((t, ctx) => {
    if (!t.trim()) return null;
    const r = inteiro(min, max, rotulo).safeParse(t);
    if (!r.success) {
      ctx.addIssue({ code: "custom", message: r.error.issues[0].message });
      return z.NEVER;
    }
    return r.data;
  });
const textoOpcional = z.string().trim().max(1000).transform((t) => t || null);

const esquema = z
  .object({
    nome: z.string().trim().min(1, "Dê um nome ao lembrete.").max(80),
    tipo: z.enum(["retorno", "pos_atendimento", "confirmacao", "aniversario"]),
    mensagem: z.string().trim().min(1, "Escreva a mensagem.").max(1000),
    ativo: z.boolean(),
    dias: inteiro(0, 730, "os dias"),
    categorias: z.array(z.enum(LISTA_CATEGORIAS as [Categoria, ...Categoria[]])),
    avisar_antes: inteiro(0, 365, "o aviso antes"),
    mensagem_atrasada: textoOpcional,
    limite_manutencoes: opcional(1, 50, "o limite de manutenções"),
    mensagem_nova_colocacao: textoOpcional,
    sumir_apos: opcional(1, 730, "o sumir depois"),
  })
  .superRefine((v, ctx) => {
    if (v.tipo === "retorno" && v.categorias.length === 0) {
      ctx.addIssue({ code: "custom", path: ["categorias"], message: "Escolha pelo menos uma categoria." });
    }
  });

export async function salvarLembrete(id: string | null, _anterior: EstadoLembrete, dados: FormData): Promise<EstadoLembrete> {
  // Ao voltar com erro, o formulário mostra só o que a pessoa acabou de mandar.
  const texto = (k: string) => String(dados.get(k) ?? "");
  const numero = (k: string) => {
    const n = Number(texto(k));
    return texto(k).trim() === "" || !Number.isFinite(n) ? null : n;
  };
  const valores: Lembrete = {
    id: id ?? "",
    nome: texto("nome"),
    tipo: texto("tipo") as TipoLembrete,
    mensagem: texto("mensagem"),
    ativo: dados.get("ativo") === "on",
    ordem: 0,
    dias: numero("dias") ?? 0,
    categorias: dados.getAll("categorias").map(String),
    avisar_antes: numero("avisar_antes") ?? 0,
    mensagem_atrasada: texto("mensagem_atrasada") || null,
    limite_manutencoes: numero("limite_manutencoes"),
    mensagem_nova_colocacao: texto("mensagem_nova_colocacao") || null,
    sumir_apos: numero("sumir_apos"),
  };
  const v = esquema.safeParse({
    nome: String(dados.get("nome") ?? ""),
    tipo: String(dados.get("tipo") ?? ""),
    mensagem: String(dados.get("mensagem") ?? ""),
    ativo: dados.get("ativo") === "on",
    dias: String(dados.get("dias") ?? ""),
    categorias: dados.getAll("categorias").map(String),
    avisar_antes: String(dados.get("avisar_antes") || "0"),
    mensagem_atrasada: String(dados.get("mensagem_atrasada") ?? ""),
    limite_manutencoes: String(dados.get("limite_manutencoes") ?? ""),
    mensagem_nova_colocacao: String(dados.get("mensagem_nova_colocacao") ?? ""),
    sumir_apos: String(dados.get("sumir_apos") ?? ""),
  });
  if (!v.success) {
    const erros: Record<string, string> = {};
    for (const i of v.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }
  const d = v.data;
  // Campos de retorno só valem para o tipo retorno.
  const linha =
    d.tipo === "retorno"
      ? d
      : { ...d, categorias: [], avisar_antes: 0, mensagem_atrasada: null, limite_manutencoes: null, mensagem_nova_colocacao: null, sumir_apos: null };

  const supabase = await criarClienteServidor();
  const { error } = id ? await supabase.from("lembretes").update(linha).eq("id", id) : await supabase.from("lembretes").insert(linha);
  if (error) return { erros: { geral: "Não deu para salvar agora. Tente de novo." }, valores };
  revalidatePath("/", "layout");
  redirect("/lembretes");
}

export async function arquivarLembrete(id: string) {
  const supabase = await criarClienteServidor();
  await supabase.from("lembretes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
  redirect("/lembretes");
}
