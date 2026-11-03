"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const esquema = z.object({
  email: z.string().trim().email("Confira o e-mail: falta algo nele."),
  senha: z.string().min(1, "Digite a senha."),
});

export type EstadoLogin = { erro?: string; email?: string } | undefined;

export async function entrar(_anterior: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const entrada = {
    email: String(dados.get("email") ?? ""),
    senha: String(dados.get("senha") ?? ""),
  };
  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return { erro: validado.error.issues[0].message, email: entrada.email };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: validado.data.email,
    password: validado.data.senha,
  });
  if (error) {
    return { erro: "E-mail ou senha não conferem. Tente de novo.", email: entrada.email };
  }
  redirect("/agenda");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
