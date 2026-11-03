// Fuso fixo de São Paulo: nem o do navegador, nem o do servidor.
import { TZDate, tz } from "@date-fns/tz";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

export const FUSO = "America/Sao_Paulo";
const noFuso = tz(FUSO);

/** "YYYY-MM-DD" válido? */
export function eData(texto: string | undefined | null): texto is string {
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = texto.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Hoje em São Paulo, "YYYY-MM-DD". */
export function hoje(): string {
  return format(new Date(), "yyyy-MM-dd", { in: noFuso });
}

/**
 * Data + hora digitadas (em São Paulo) → instante real.
 * Atenção: TZDate.toISOString() devolve "-03:00", não UTC; por isso o new Date().
 */
export function instante(data: string, hora = "00:00"): Date {
  const [a, m, d] = data.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  return new Date(new TZDate(a, m - 1, d, h, mi, FUSO).getTime());
}

/** Instante → partes em São Paulo. */
export function partes(quando: Date | string) {
  const t = typeof quando === "string" ? new Date(quando) : quando;
  const hora = format(t, "HH:mm", { in: noFuso });
  const [h, m] = hora.split(":").map(Number);
  return { data: format(t, "yyyy-MM-dd", { in: noFuso }), hora, minutosDoDia: h * 60 + m };
}

/** Soma dias numa data "YYYY-MM-DD" (conta só no calendário, sem fuso). */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Dia da semana de uma data (0 = domingo). */
export function diaDaSemana(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Minutos inteiros desde 1970: a unidade de tempo do núcleo C. */
export function emMinutos(quando: Date | string): number {
  return Math.floor(new Date(quando).getTime() / 60000);
}

/** "terça-feira, 3 de novembro" */
export function dataPorExtenso(data: string, comAno = false): string {
  return format(instante(data, "12:00"), comAno ? "EEEE, d 'de' MMMM 'de' yyyy" : "EEEE, d 'de' MMMM", {
    in: noFuso,
    locale: ptBR,
  });
}

/** "03/11" */
export function dataCurta(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/** "novembro de 2026" para "2026-11" */
export function mesPorExtenso(mes: string): string {
  return format(instante(`${mes}-15`, "12:00"), "MMMM 'de' yyyy", { in: noFuso, locale: ptBR });
}

/** Quantos dias tem o mês "YYYY-MM". */
export function diasNoMes(mes: string): number {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** "2026-11" ± n meses */
export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1 + n, 1));
  return t.toISOString().slice(0, 7);
}
