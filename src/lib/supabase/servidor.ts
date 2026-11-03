import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Cliente do Supabase para Server Components e Server Actions.
export async function criarClienteServidor() {
  const loja = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseChave, {
    cookies: {
      getAll() {
        return loja.getAll();
      },
      setAll(lista) {
        try {
          lista.forEach(({ name, value, options }) => loja.set(name, value, options));
        } catch {
          // Chamado de um Server Component: quem renova a sessão é o proxy.
        }
      },
    },
  });
}
