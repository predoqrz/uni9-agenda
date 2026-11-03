/** Minúsculas e sem acento, para a busca enquanto digita. */
export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Todos os pedaços digitados precisam aparecer no texto ("ana sil" acha "Ana Paula Silva"). */
export function casaBusca(alvo: string, busca: string): boolean {
  const pedacos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
  if (pedacos.length === 0) return true;
  const base = normalizarBusca(alvo);
  return pedacos.every((p) => base.includes(p));
}
