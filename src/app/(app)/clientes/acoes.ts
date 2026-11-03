"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { normalizarTelefone } from "@/lib/telefone";

const esquema = z.object({
  nome: z.string().trim().min(1, "Digite o nome.").max(120, "Nome longo demais."),
  telefone: z
    .string()
    .trim()
    .transform((t, ctx) => {
      if (!t) return null;
      const n = normalizarTelefone(t);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Telefone não reconhecido. Use DDD + número." });
        return z.NEVER;
      }
      return n;
    }),
  nascimento: z
    .string()
    .trim()
    .transform((t) => t || null)
    .refine((t) => !t || /^\d{4}-\d{2}-\d{2}$/.test(t), "Data inválida."),
  rede_social: z.string().trim().max(120).transform((t) => t || null),
  observacoes: z.string().trim().max(2000).transform((t) => t || null),
});

type Campos = z.input<typeof esquema>;
export type EstadoCliente =
  | { erros?: Partial<Record<keyof Campos | "geral", string>>; valores?: Campos }
  | undefined;

function lerFormulario(dados: FormData): Campos {
  return {
    nome: String(dados.get("nome") ?? ""),
    telefone: String(dados.get("telefone") ?? ""),
    nascimento: String(dados.get("nascimento") ?? ""),
    rede_social: String(dados.get("rede_social") ?? ""),
    observacoes: String(dados.get("observacoes") ?? ""),
  };
}

export async function salvarCliente(
  id: string | null,
  _anterior: EstadoCliente,
  dados: FormData,
): Promise<EstadoCliente> {
  const valores = lerFormulario(dados);
  const validado = esquema.safeParse(valores);
  if (!validado.success) {
    const erros: NonNullable<EstadoCliente>["erros"] = {};
    for (const i of validado.error.issues) erros[i.path[0] as keyof Campos] ??= i.message;
    return { erros, valores };
  }

  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("clientes").update(validado.data).eq("id", id)
    : await supabase.from("clientes").insert(validado.data);

  if (error) {
    if (error.code === "23505") {
      return { erros: { telefone: "Já existe uma cliente com esse telefone." }, valores };
    }
    return { erros: { geral: "Não deu para salvar agora. Tente de novo." }, valores };
  }
  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function arquivarCliente(id: string) {
  const supabase = await criarClienteServidor();
  await supabase.from("clientes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function restaurarCliente(id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("clientes").update({ deleted_at: null }).eq("id", id);
  revalidatePath("/clientes");
  // Telefone repetido com uma cliente ativa impede restaurar.
  redirect(error ? "/clientes?arquivadas=1&erro=telefone" : "/clientes?arquivadas=1");
}

export type ContatoImportado = { nome: string; telefone: string };
export type ResultadoImportacao = { importadas: number; puladas: number } | { erro: string };

/** Importa os contatos marcados; pula quem já existe pelo telefone. */
export async function importarContatos(contatos: ContatoImportado[]): Promise<ResultadoImportacao> {
  const limpos = new Map<string, string>();
  for (const c of contatos.slice(0, 5000)) {
    const telefone = normalizarTelefone(c.telefone);
    const nome = c.nome.trim().slice(0, 120);
    if (telefone && nome && !limpos.has(telefone)) limpos.set(telefone, nome);
  }
  if (limpos.size === 0) return { importadas: 0, puladas: contatos.length };

  const supabase = await criarClienteServidor();
  const existentes = new Set<string>();
  const telefones = [...limpos.keys()];
  for (let i = 0; i < telefones.length; i += 500) {
    const { data, error } = await supabase
      .from("clientes")
      .select("telefone")
      .is("deleted_at", null)
      .in("telefone", telefones.slice(i, i + 500));
    if (error) return { erro: "Não deu para conferir as clientes existentes." };
    for (const l of data ?? []) if (l.telefone) existentes.add(l.telefone);
  }

  const novas = [...limpos].filter(([t]) => !existentes.has(t)).map(([telefone, nome]) => ({ nome, telefone }));
  for (let i = 0; i < novas.length; i += 500) {
    const { error } = await supabase.from("clientes").insert(novas.slice(i, i + 500));
    if (error) return { erro: "A importação parou no meio. As que entraram já aparecem na lista." };
  }
  revalidatePath("/clientes");
  return { importadas: novas.length, puladas: contatos.length - novas.length };
}
