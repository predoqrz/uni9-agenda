// Lê as variáveis públicas do Supabase e falha com uma mensagem clara se faltarem.
function exigir(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Falta a variável de ambiente ${nome}. Preencha no arquivo .env.local ` +
        `(veja .env.example) e no painel da Vercel (Settings → Environment Variables).`,
    );
  }
  return valor;
}

export const env = {
  supabaseUrl: exigir("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseChave: exigir(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
};
