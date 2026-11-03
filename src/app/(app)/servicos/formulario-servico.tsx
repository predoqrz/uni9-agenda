"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Aviso, BotaoPrincipal, Campo, estiloCampo } from "@/components/ui";
import { formatarDinheiro, lerDinheiro } from "@/lib/nucleo";
import { CATEGORIAS, LISTA_CATEGORIAS } from "@/lib/servicos";
import { useRodada } from "@/lib/usar-rodada";
import { salvarServico, type EstadoServico } from "./acoes";

export type ServicoFormulario = {
  id: string | null;
  nome: string;
  categoria: string;
  preco: string;
  duracao_min: string;
  sinal: string;
  custo: string;
  e_manutencao: boolean;
  ativo: boolean;
};

/** Campo de dinheiro: o núcleo C mostra ao vivo como o valor foi entendido. */
function CampoDinheiro({ nome, rotulo, inicial, erro, dica }: { nome: string; rotulo: string; inicial: string; erro?: string; dica?: string }) {
  const [texto, setTexto] = useState(inicial);
  const leitura = texto.trim() ? lerDinheiro(texto) : null;
  const entendido = leitura?.ok ? `Entendi ${formatarDinheiro(leitura.centavos)}` : undefined;
  return (
    <Campo rotulo={rotulo} erro={erro ?? (leitura && !leitura.ok ? leitura.erro : undefined)} dica={entendido ?? dica}>
      <input
        name={nome}
        inputMode="decimal"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="0,00"
        className={`${estiloCampo} tabular-nums`}
      />
    </Campo>
  );
}

function Interruptor({ nome, rotulo, inicial }: { nome: string; rotulo: string; inicial: boolean }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-linha px-4">
      <span className="font-medium">{rotulo}</span>
      <input type="checkbox" name={nome} defaultChecked={inicial} className="size-6 accent-[var(--dourado)]" />
    </label>
  );
}

export function FormularioServico({ inicial }: { inicial: ServicoFormulario }) {
  const [estado, acao, enviando] = useActionState<EstadoServico, FormData>(
    salvarServico.bind(null, inicial.id),
    undefined,
  );
  const rodada = useRodada(estado);
  const v = estado?.valores ?? inicial;
  const e = estado?.erros ?? {};

  return (
    <form key={rodada} action={acao} className="flex flex-col gap-5" noValidate>
      {e.geral && <Aviso tipo="erro">{e.geral}</Aviso>}
      <Campo rotulo="Nome" erro={e.nome}>
        <input name="nome" defaultValue={v.nome} placeholder="Ex.: Volume brasileiro" className={estiloCampo} />
      </Campo>
      <Campo rotulo="Categoria" erro={e.categoria}>
        <select name="categoria" defaultValue={v.categoria} className={estiloCampo}>
          {LISTA_CATEGORIAS.map((c) => (
            <option key={c} value={c}>{CATEGORIAS[c]}</option>
          ))}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <CampoDinheiro nome="preco" rotulo="Preço" inicial={v.preco} erro={e.preco} />
        <Campo rotulo="Duração (min)" erro={e.duracao_min}>
          <input name="duracao_min" inputMode="numeric" defaultValue={v.duracao_min} className={`${estiloCampo} tabular-nums`} />
        </Campo>
      </div>
      <CampoDinheiro nome="sinal" rotulo="Sinal de reserva" inicial={v.sinal} erro={e.sinal} dica="Não reembolsável. Deixe vazio se não cobra." />
      <CampoDinheiro nome="custo" rotulo="Custo de material" inicial={v.custo} erro={e.custo} dica="Gasto com material por atendimento." />
      <Interruptor nome="e_manutencao" rotulo="É manutenção" inicial={v.e_manutencao} />
      <Interruptor nome="ativo" rotulo="Aparece para agendar" inicial={v.ativo} />
      <BotaoPrincipal type="submit" disabled={enviando}>
        {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
        {enviando ? "Salvando…" : "Salvar"}
      </BotaoPrincipal>
    </form>
  );
}
