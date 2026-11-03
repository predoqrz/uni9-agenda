import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// Conveniência: manda para /login quem não está logado e renova a sessão.
// Quem protege os dados de verdade é a RLS no banco.
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseChave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() valida o token localmente, sem ir à rede a cada página.
  const { data } = await supabase.auth.getClaims();
  const logada = Boolean(data?.claims);
  const naLogin = request.nextUrl.pathname.startsWith("/login");

  if (!logada && !naLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (logada && naLogin) {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }
  return resposta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
