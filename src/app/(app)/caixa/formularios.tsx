"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Aviso, BotaoPrincipal, Campo, estiloCampo } from "@/components/ui";
import { FORMAS_PAGAMENTO } from "@/lib/caixa";
import { formatarDinheiro, lerDinheiro } from "@/lib/nucleo";
import { useRodada } from "@/lib/usar-rodada";
import { salvarLancamento, salvarRecorrencia, type EstadoForm } from "./acoes";

function Segmentado({ nome, opcoes, valor, aoMudar }: { nome: string; opcoes: [string, string][]; valor: string; aoMudar?: (v: string) => void }) {
  return (
    <div role="radiogroup" className="grid gap-1 rounded-2xl bg-superficie p-1" style={{ gridTemplateColumns: `repeat(${opcoes.length}, 1fr)` }}>
      {opcoes.map(([v, rotulo]) => (
        <label key={v} className={`apertavel flex h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold has-[:checked]:bg-preto has-[:checked]:text-dourado has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-dourado ${"text-secundario"}`}>
          <input type="radio" name={nome} value={v} defaultChecked={valor === v} onChange={() => aoMudar?.(v)} className="sr-only" />
          {rotulo}
        </label>
      ))}
    </div>
  );
}

function CampoValor({ inicial, erro }: { inicial: string; erro?: string }) {
  const [texto, setTexto] = useState(inicial);
  const r = texto.trim() ? lerDinheiro(texto) : null;
  return (
    <Campo rotulo="Valor" erro={erro ?? (r && !r.ok ? r.erro : undefined)} dica={r?.ok ? `Entendi ${formatarDinheiro(r.centavos)}` : undefined}>
      <input name="valor" inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="0,00" className={`${estiloCampo} tabular-nums`} />
    </Campo>
  );
}

export type LancamentoForm = {
  tipo: string;
  esfera: string;
  valor: string;
  data: string;
  descricao: string;
  categoria: string;
  forma_pagamento: string;
};

export function FormularioLancamento({ id, inicial }: { id: string | null; inicial: LancamentoForm }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(salvarLancamento.bind(null, id), undefined);
  const rodada = useRodada(estado);
  const v = (estado?.valores as LancamentoForm | undefined) ?? inicial;
  const e = estado?.erros ?? {};
  const [tipo, setTipo] = useState(v.tipo);

  return (
    <form key={rodada} action={acao} className="flex flex-col gap-5" noValidate>
      {e.geral && <Aviso tipo="erro">{e.geral}</Aviso>}
      <Segmentado nome="tipo" valor={v.tipo} aoMudar={setTipo} opcoes={[["entrada", "Entrada"], ["saida", "Saída"], ["transferencia", "Transferência"]]} />
      <Campo rotulo={tipo === "transferencia" ? "Para onde vai o dinheiro" : "Esfera"} erro={e.esfera}>
        <Segmentado nome="esfera" valor={v.esfera} opcoes={tipo === "transferencia" ? [["pessoal", "Empresa → Pessoal"], ["empresa", "Pessoal → Empresa"]] : [["empresa", "Empresa"], ["pessoal", "Pessoal"]]} />
      </Campo>
      <input type="hidden" name="esfera_origem" value="" />
      <CampoValor inicial={v.valor} erro={e.valor} />
      <Campo rotulo="Data" erro={e.data}>
        <input type="date" name="data" defaultValue={v.data} className={estiloCampo} />
      </Campo>
      <Campo rotulo="Descrição" erro={e.descricao}>
        <input name="descricao" defaultValue={v.descricao} placeholder={tipo === "transferencia" ? "Ex.: pró-labore" : "Ex.: compra de cola"} className={estiloCampo} />
      </Campo>
      {tipo !== "transferencia" && (
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Categoria" erro={e.categoria}>
            <input name="categoria" defaultValue={v.categoria} placeholder="Ex.: Material" className={estiloCampo} />
          </Campo>
          <Campo rotulo="Forma" erro={e.forma_pagamento}>
            <select name="forma_pagamento" defaultValue={v.forma_pagamento} className={estiloCampo}>
              <option value="">—</option>
              {Object.entries(FORMAS_PAGAMENTO).map(([k, r]) => (
                <option key={k} value={k}>{r}</option>
              ))}
            </select>
          </Campo>
        </div>
      )}
      <BotaoPrincipal type="submit" disabled={enviando}>
        {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
        {enviando ? "Salvando…" : "Salvar"}
      </BotaoPrincipal>
    </form>
  );
}

export type RecorrenciaForm = {
  tipo: string;
  esfera: string;
  valor: string;
  descricao: string;
  categoria: string;
  dia_mes: string;
  comeca_em: string;
  ativo: string;
};

export function FormularioRecorrencia({ id, inicial }: { id: string | null; inicial: RecorrenciaForm }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(salvarRecorrencia.bind(null, id), undefined);
  const rodada = useRodada(estado);
  const v = (estado?.valores as RecorrenciaForm | undefined) ?? inicial;
  const e = estado?.erros ?? {};

  return (
    <form key={rodada} action={acao} className="flex flex-col gap-5" noValidate>
      {e.geral && <Aviso tipo="erro">{e.geral}</Aviso>}
      <Segmentado nome="tipo" valor={v.tipo} opcoes={[["saida", "Conta a pagar"], ["entrada", "Entrada fixa"]]} />
      <Segmentado nome="esfera" valor={v.esfera} opcoes={[["empresa", "Empresa"], ["pessoal", "Pessoal"]]} />
      <Campo rotulo="Nome" erro={e.descricao}>
        <input name="descricao" defaultValue={v.descricao} placeholder="Ex.: Aluguel da sala" className={estiloCampo} />
      </Campo>
      <CampoValor inicial={v.valor} erro={e.valor} />
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Todo dia" erro={e.dia_mes} dica="31 = último dia do mês">
          <input name="dia_mes" inputMode="numeric" defaultValue={v.dia_mes} className={`${estiloCampo} tabular-nums`} />
        </Campo>
        <Campo rotulo="Começa em" erro={e.comeca_em}>
          <input type="date" name="comeca_em" defaultValue={v.comeca_em} className={estiloCampo} />
        </Campo>
      </div>
      <Campo rotulo="Categoria" erro={e.categoria}>
        <input name="categoria" defaultValue={v.categoria} placeholder="Ex.: Aluguel" className={estiloCampo} />
      </Campo>
      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-linha px-4">
        <span className="font-medium">Ativa</span>
        <input type="checkbox" name="ativo" defaultChecked={v.ativo === "on"} className="size-6 accent-[var(--dourado)]" />
      </label>
      <BotaoPrincipal type="submit" disabled={enviando}>
        {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
        {enviando ? "Salvando…" : "Salvar"}
      </BotaoPrincipal>
    </form>
  );
}
