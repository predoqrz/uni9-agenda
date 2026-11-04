// Mensagens de WhatsApp: o app só abre a conversa com o texto pronto; quem envia é a profissional.

export type Marcadores = { nome?: string; servico?: string; data?: string; hora?: string; prazo?: string };

/** Troca {nome}, {servico}, {data}, {hora} e {prazo}. {nome} vira só o primeiro nome. */
export function preencher(texto: string, m: Marcadores): string {
  const primeiroNome = (m.nome ?? "").trim().split(/\s+/)[0] ?? "";
  return texto.replace(/\{(nome|servico|data|hora|prazo)\}/g, (_, chave: keyof Marcadores) =>
    chave === "nome" ? primeiroNome : (m[chave] ?? ""),
  );
}

/** https://wa.me/55NUMERO?text=… (telefone só com dígitos, com DDD). */
export function linkWhatsApp(telefone: string, texto?: string): string {
  const base = `https://wa.me/55${telefone.replace(/\D/g, "")}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
