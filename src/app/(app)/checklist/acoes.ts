"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const ID = /^[0-9a-f-]{36}$/i;

/** Marca o contato como feito. Na confirmação, "Confirmou" também muda o status do horário. */
export async function marcarFeito(lembreteId: string, clienteId: string, referencia: string, confirmarAtendimento: string | null) {
  if (!ID.test(lembreteId) || !ID.test(clienteId) || !referencia || referencia.length > 64) return;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("contatos").insert({ lembrete_id: lembreteId, cliente_id: clienteId, referencia });
  // 23505 = já estava marcado (dois toques rápidos): tudo bem.
  if (error && error.code !== "23505") throw new Error("Não deu para marcar agora.");
  if (confirmarAtendimento && ID.test(confirmarAtendimento)) {
    await supabase.from("atendimentos").update({ status: "confirmado" }).eq("id", confirmarAtendimento).eq("status", "agendado");
  }
  revalidatePath("/", "layout");
}

/** Desfazer: arquiva o contato (nada é apagado). Não desfaz a confirmação do horário. */
export async function desfazerFeito(contatoId: string) {
  if (!ID.test(contatoId)) return;
  const supabase = await criarClienteServidor();
  await supabase.from("contatos").update({ deleted_at: new Date().toISOString() }).eq("id", contatoId);
  revalidatePath("/", "layout");
}
