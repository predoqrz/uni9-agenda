export const CATEGORIAS = {
  extensao_cilios: "Extensão de cílios",
  design: "Design",
  sobrancelhas: "Sobrancelhas",
  cilios: "Cílios",
  labios: "Lábios",
  facial: "Facial",
  outros: "Outros",
} as const;

export type Categoria = keyof typeof CATEGORIAS;
export const LISTA_CATEGORIAS = Object.keys(CATEGORIAS) as Categoria[];
