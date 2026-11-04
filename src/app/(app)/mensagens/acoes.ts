"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ValoresMensagem = { titulo: string; texto: string };
export type EstadoMensagem = { erros?: Record<string, string>; valores?: ValoresMensagem } | undefined;

const esquema = z.object({
  titulo: z.string().trim().min(1, "Dê um título.").max(80),
  texto: z.string().trim().min(1, "Escreva o texto.").max(1000),
});

export async function salvarMensagem(id: string | null, _anterior: EstadoMensagem, dados: FormData): Promise<EstadoMensagem> {
  const valores = { titulo: String(dados.get("titulo") ?? ""), texto: String(dados.get("texto") ?? "") };
  const v = esquema.safeParse(valores);
  if (!v.success) {
    const erros: Record<string, string> = {};
    for (const i of v.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }
  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("mensagens_prontas").update(v.data).eq("id", id)
    : await supabase.from("mensagens_prontas").insert({ ...v.data, ordem: 99 });
  if (error) return { erros: { geral: "Não deu para salvar agora. Tente de novo." }, valores };
  revalidatePath("/", "layout");
  redirect("/mensagens");
}

export async function arquivarMensagem(id: string) {
  const supabase = await criarClienteServidor();
  await supabase.from("mensagens_prontas").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
  redirect("/mensagens");
}
