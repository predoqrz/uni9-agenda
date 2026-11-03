// Camada tipada sobre o núcleo C (WebAssembly). O resto do app usa só estas funções.
import { NUCLEO_WASM_BASE64 } from "./wasm-embutido.ts";

type Exportacoes = {
  memory: WebAssembly.Memory;
  nucleo_entrada: () => number;
  nucleo_saida: () => number;
  nucleo_numeros: () => number;
  nucleo_ler: () => number;
  nucleo_formatar: () => number;
  nucleo_repartir: (n: number) => number;
  nucleo_horarios: () => number;
  nucleo_colunas: (n: number) => number;
  nucleo_conflitos: (ini: number, fim: number, n: number) => number;
};

const AGENDA_MAX = 128;

let instancia: Exportacoes | null = null;

// Carrega uma vez só. O módulo tem ~2 KB, então a compilação síncrona é imediata.
function nucleo(): Exportacoes {
  if (!instancia) {
    const bytes = Uint8Array.from(atob(NUCLEO_WASM_BASE64), (c) => c.charCodeAt(0));
    const modulo = new WebAssembly.Module(bytes);
    instancia = new WebAssembly.Instance(modulo, {}).exports as unknown as Exportacoes;
  }
  return instancia;
}

const MENSAGENS: Record<number, string> = {
  1: "Digite um valor.",
  2: "Valor não reconhecido. Use, por exemplo, 120 ou 120,50.",
  3: "Valor alto demais. Confira os zeros.",
};

export type Leitura = { ok: true; centavos: number } | { ok: false; erro: string };

const codificador = new TextEncoder();
const decodificador = new TextDecoder();

/** "1.234,56" → 123456 centavos. */
export function lerDinheiro(texto: string): Leitura {
  const n = nucleo();
  const bytes = codificador.encode(texto);
  if (bytes.length > 255) return { ok: false, erro: MENSAGENS[2] };
  const memoria = new Uint8Array(n.memory.buffer, n.nucleo_entrada(), 256);
  memoria.set(bytes);
  memoria[bytes.length] = 0;
  const erro = n.nucleo_ler();
  if (erro !== 0) return { ok: false, erro: MENSAGENS[erro] ?? MENSAGENS[2] };
  const centavos = new BigInt64Array(n.memory.buffer, n.nucleo_numeros(), 1)[0];
  return { ok: true, centavos: Number(centavos) };
}

/** 123456 → "R$ 1.234,56". */
export function formatarDinheiro(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) throw new Error(`Centavos inválidos: ${centavos}`);
  const n = nucleo();
  new BigInt64Array(n.memory.buffer, n.nucleo_numeros(), 1)[0] = BigInt(centavos);
  n.nucleo_formatar();
  const saida = new Uint8Array(n.memory.buffer, n.nucleo_saida(), 32);
  return decodificador.decode(saida.subarray(0, saida.indexOf(0)));
}

/** Reparte `total` proporcionalmente aos `pesos`; a soma do resultado é exatamente `total`. */
export function repartirDinheiro(total: number, pesos: number[]): number[] {
  if (pesos.length > 64) throw new Error("No máximo 64 itens.");
  const n = nucleo();
  const numeros = new BigInt64Array(n.memory.buffer, n.nucleo_numeros(), 65);
  numeros[0] = BigInt(total);
  pesos.forEach((p, i) => (numeros[1 + i] = BigInt(p)));
  if (n.nucleo_repartir(pesos.length) !== 0) throw new Error("Valores inválidos para repartir.");
  return Array.from(numeros.subarray(1, 1 + pesos.length), Number);
}

/** Intervalo em minutos inteiros (ex.: minutos desde 1970). Fim exclusivo. */
export type Intervalo = { inicio: number; fim: number };

function escreverHorarios(n: Exportacoes, lista: Intervalo[]): Int32Array {
  if (lista.length > AGENDA_MAX) throw new Error(`No máximo ${AGENDA_MAX} horários.`);
  const k = lista.length;
  const memoria = new Int32Array(n.memory.buffer, n.nucleo_horarios(), 4 * AGENDA_MAX);
  lista.forEach((h, i) => {
    memoria[i] = h.inicio;
    memoria[k + i] = h.fim;
  });
  return memoria;
}

/** Índices dos horários existentes que cruzam o novo. Só encostar não conta. */
export function conflitosDeHorario(novo: Intervalo, existentes: Intervalo[]): number[] {
  const n = nucleo();
  const memoria = escreverHorarios(n, existentes);
  const total = n.nucleo_conflitos(novo.inicio, novo.fim, existentes.length);
  if (total < 0) throw new Error("Horário inválido.");
  const k = existentes.length;
  return Array.from(memoria.subarray(2 * k, 2 * k + total));
}

/** Coluna de cada atendimento e quantas colunas seu grupo usa, para encaixes lado a lado. */
export function colunasDoDia(lista: Intervalo[]): { coluna: number; colunas: number }[] {
  const n = nucleo();
  const memoria = escreverHorarios(n, lista);
  if (n.nucleo_colunas(lista.length) !== 0) throw new Error("Horário inválido.");
  const k = lista.length;
  return lista.map((_, i) => ({ coluna: memoria[2 * k + i], colunas: memoria[3 * k + i] }));
}
