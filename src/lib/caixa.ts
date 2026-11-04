import { diaDeVencimento } from "@/lib/nucleo";
import { diasNoMes, eData, hoje, somarDias, somarMeses } from "@/lib/tempo";

export type Esfera = "empresa" | "pessoal";
export type Tipo = "entrada" | "saida" | "transferencia";

export const FORMAS_PAGAMENTO = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  boleto: "Boleto",
  outro: "Outro",
} as const;
export type FormaPagamento = keyof typeof FORMAS_PAGAMENTO;

export type Lancamento = {
  id: string;
  tipo: Tipo;
  esfera: Esfera;
  esfera_origem: Esfera | null;
  valor_centavos: number;
  data: string;
  descricao: string;
  categoria: string;
  forma_pagamento: FormaPagamento | null;
  origem: "atendimento" | "sinal" | "recorrencia" | "manual" | "importacao";
  origem_id: string | null;
};

export type Periodo = { de: string; ate: string; mes: string | null };

/** Lê ?mes=YYYY-MM ou ?de=&ate= (período livre). Padrão: mês atual. */
export function lerPeriodo(sp: { mes?: string; de?: string; ate?: string }): Periodo {
  if (eData(sp.de) && eData(sp.ate) && sp.de <= sp.ate && somarDias(sp.de, 731) >= sp.ate) {
    return { de: sp.de, ate: sp.ate, mes: null };
  }
  const mes = sp.mes && eData(`${sp.mes}-01`) ? sp.mes : hoje().slice(0, 7);
  return { de: `${mes}-01`, ate: `${mes}-${String(diasNoMes(mes)).padStart(2, "0")}`, mes };
}

export function linkPeriodo(p: Periodo): string {
  return p.mes ? `mes=${p.mes}` : `de=${p.de}&ate=${p.ate}`;
}

/** Efeito de um lançamento no saldo de uma esfera (ou no total, se esfera = null). */
export function efeito(l: Pick<Lancamento, "tipo" | "esfera" | "esfera_origem" | "valor_centavos">, esfera: Esfera | null): number {
  if (l.tipo === "transferencia") {
    if (esfera === null) return 0; // muda o saldo de cada esfera, não o total
    if (l.esfera === esfera) return l.valor_centavos;
    if (l.esfera_origem === esfera) return -l.valor_centavos;
    return 0;
  }
  if (esfera !== null && l.esfera !== esfera) return 0;
  return l.tipo === "entrada" ? l.valor_centavos : -l.valor_centavos;
}

export type Recorrencia = {
  id: string;
  tipo: "entrada" | "saida";
  esfera: Esfera;
  valor_centavos: number;
  descricao: string;
  categoria: string;
  dia_mes: number;
  comeca_em: string;
  ativo: boolean;
};

/**
 * Contas fixas que ainda vão vencer dentro do período (depois de hoje): só previsão,
 * nunca lançamento. O dia vem do núcleo C (dia 31 → último dia nos meses curtos).
 */
export function recorrenciasPrevistas(recorrencias: Recorrencia[], p: Periodo): { r: Recorrencia; data: string }[] {
  const amanha = somarDias(hoje(), 1);
  const saida: { r: Recorrencia; data: string }[] = [];
  for (let mes = p.de.slice(0, 7); mes <= p.ate.slice(0, 7); mes = somarMeses(mes, 1)) {
    const [a, m] = mes.split("-").map(Number);
    for (const r of recorrencias) {
      if (!r.ativo) continue;
      const data = `${mes}-${String(diaDeVencimento(a, m, r.dia_mes)).padStart(2, "0")}`;
      if (data >= amanha && data >= p.de && data <= p.ate && data >= r.comeca_em) saida.push({ r, data });
    }
  }
  return saida.sort((x, y) => x.data.localeCompare(y.data));
}
