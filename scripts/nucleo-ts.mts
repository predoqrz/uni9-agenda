// Mesmo protocolo da CLI em C (nucleo/src/cli.c), mas passando pela camada
// TypeScript + WebAssembly que o app usa. Usado pelos testes cruzados em Python.
import { createInterface } from "node:readline";
import { colunasDoDia, conflitosDeHorario, diaDeVencimento, formatarDinheiro, lerDinheiro, repartirDinheiro } from "../src/lib/nucleo/index.ts";

const CODIGOS: Record<string, number> = {
  "Digite um valor.": 1,
  "Valor não reconhecido. Use, por exemplo, 120 ou 120,50.": 2,
  "Valor alto demais. Confira os zeros.": 3,
};

for await (const linha of createInterface({ input: process.stdin })) {
  if (linha.startsWith("ler ")) {
    const r = lerDinheiro(linha.slice(4));
    console.log(r.ok ? `ok ${r.centavos}` : `erro ${CODIGOS[r.erro]}`);
  } else if (linha.startsWith("formatar ")) {
    console.log(`ok ${formatarDinheiro(Number(linha.slice(9)))}`);
  } else if (linha.startsWith("repartir ")) {
    const [total, ...pesos] = linha.slice(9).trim().split(/\s+/).map(Number);
    try {
      console.log(["ok", ...repartirDinheiro(total, pesos)].join(" "));
    } catch {
      console.log("erro 2");
    }
  } else if (linha.startsWith("colunas ") || linha.startsWith("conflitos ")) {
    const colunas = linha.startsWith("colunas ");
    const nums = linha.slice(colunas ? 8 : 10).trim().split(/\s+/).filter(Boolean).map(Number);
    const novo = colunas ? null : { inicio: nums.shift()!, fim: nums.shift()! };
    const lista = [];
    for (let i = 0; i + 1 < nums.length; i += 2) lista.push({ inicio: nums[i], fim: nums[i + 1] });
    try {
      const r = novo ? conflitosDeHorario(novo, lista) : colunasDoDia(lista).map((c) => `${c.coluna}/${c.colunas}`);
      console.log(["ok", ...r].join(" "));
    } catch {
      console.log("erro 2");
    }
  } else if (linha.startsWith("vencimento ")) {
    const [a, m, d] = linha.slice(11).trim().split(/\s+/).map(Number);
    try {
      console.log(`ok ${diaDeVencimento(a, m, d)}`);
    } catch {
      console.log("ok 0");
    }
  } else {
    console.log("erro 99");
  }
}
