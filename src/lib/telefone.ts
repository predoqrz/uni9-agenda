// DDD usado quando o número vem sem DDD (ex.: contato antigo salvo só com 8/9 dígitos).
export const DDD_PADRAO = "11";

/**
 * Normaliza um telefone para só dígitos com DDD (10 ou 11 dígitos).
 * Aceita +55, 0 + DDD, 0 + operadora + DDD e número sem DDD.
 * Devolve null se não der para entender.
 */
export function normalizarTelefone(texto: string, dddPadrao = DDD_PADRAO): string | null {
  let d = texto.replace(/\D/g, "");
  if (!d) return null;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.startsWith("0")) {
    // 0 + operadora (2 dígitos) + DDD + número, ou 0 + DDD + número
    if (d.length === 13 || d.length === 14) d = d.slice(3);
    else d = d.slice(1);
  }
  if (d.length === 8 || d.length === 9) d = dddPadrao + d;
  if (d.length !== 10 && d.length !== 11) return null;
  if (d[0] === "0") return null;
  return d;
}

/** "11987654321" → "(11) 98765-4321" */
export function formatarTelefone(digitos: string | null | undefined): string {
  if (!digitos) return "";
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  const corte = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
