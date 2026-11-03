"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { LoaderCircle, Plus, Search, TriangleAlert, X } from "lucide-react";
import { Aviso, BotaoPrincipal, Campo, estiloCampo } from "@/components/ui";
import { formatarDinheiro, lerDinheiro } from "@/lib/nucleo";
import { formatarTelefone } from "@/lib/telefone";
import { casaBusca } from "@/lib/texto";
import { salvarAtendimento, type EstadoAtendimento } from "./acoes";

export type OpcaoCliente = { id: string; nome: string; telefone: string | null };
export type OpcaoServico = { id: string; nome: string; preco_centavos: number; duracao_min: number; sinal_centavos: number };
export type ItemFormulario = { chave: string; servico_id: string; valor: string };
export type AtendimentoFormulario = {
  id: string | null;
  cliente_id: string;
  data: string;
  hora: string;
  duracao_min: string;
  duracaoManual: boolean;
  itens: ItemFormulario[];
  desconto: string;
  sinal: string;
  sinalManual: boolean;
  observacoes: string;
};

const paraCampo = (centavos: number) => (centavos ? formatarDinheiro(centavos).replace("R$ ", "") : "");
const centavos = (texto: string) => {
  if (!texto.trim()) return 0;
  const r = lerDinheiro(texto);
  return r.ok ? r.centavos : null;
};

/** Campo de busca com lista de sugestões, para escolher com uma mão. */
function Buscador<T extends { id: string }>({
  opcoes,
  texto,
  rotulo,
  placeholder,
  aoEscolher,
  linha,
}: {
  opcoes: T[];
  texto: (o: T) => string;
  rotulo: string;
  placeholder: string;
  aoEscolher: (o: T) => void;
  linha: (o: T) => React.ReactNode;
}) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const achados = useMemo(
    () => opcoes.filter((o) => casaBusca(texto(o), busca)).slice(0, 8),
    [opcoes, busca, texto],
  );
  return (
    <div className="relative">
      <label className="relative block">
        <span className="sr-only">{rotulo}</span>
        <Search size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-secundario" aria-hidden />
        <input
          type="search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder={placeholder}
          className={`${estiloCampo} pl-12`}
        />
      </label>
      {aberto && (
        <ul className="absolute right-0 left-0 z-20 mt-1 max-h-80 overflow-auto rounded-2xl border border-linha bg-branco shadow-[0_12px_30px_-12px_rgba(17,17,17,0.35)]">
          {achados.length === 0 ? (
            <li className="px-4 py-4 text-secundario">Nada encontrado.</li>
          ) : (
            achados.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    aoEscolher(o);
                    setBusca("");
                    setAberto(false);
                  }}
                  className="flex min-h-14 w-full items-center px-4 py-2 text-left hover:bg-superficie"
                >
                  {linha(o)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function FormularioAtendimento({
  inicial,
  clientes,
  servicos,
}: {
  inicial: AtendimentoFormulario;
  clientes: OpcaoCliente[];
  servicos: OpcaoServico[];
}) {
  const [estado, acao, enviando] = useActionState<EstadoAtendimento, FormData>(
    salvarAtendimento.bind(null, inicial.id),
    undefined,
  );
  const [f, setF] = useState(inicial);
  const forcar = useRef<HTMLInputElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const proximaChave = useRef(0);

  const porId = useMemo(() => new Map(servicos.map((s) => [s.id, s])), [servicos]);
  const cliente = clientes.find((c) => c.id === f.cliente_id);

  // Contas ao vivo: valores e desconto lidos pelo núcleo C.
  const valores = f.itens.map((i) => centavos(i.valor));
  const valoresOk = valores.every((v) => v !== null);
  const soma = valores.reduce<number>((s, v) => s + (v ?? 0), 0);
  const desconto = centavos(f.desconto);
  const total = desconto === null ? null : soma - desconto;
  const duracaoSoma = f.itens.reduce((s, i) => s + (porId.get(i.servico_id)?.duracao_min ?? 0), 0);
  const sinalSoma = f.itens.reduce((s, i) => s + (porId.get(i.servico_id)?.sinal_centavos ?? 0), 0);

  function adicionar(s: OpcaoServico) {
    setF((v) => {
      const itens = [...v.itens, { chave: `n${proximaChave.current++}`, servico_id: s.id, valor: paraCampo(s.preco_centavos) }];
      return recalcular({ ...v, itens });
    });
  }
  function remover(chave: string) {
    setF((v) => recalcular({ ...v, itens: v.itens.filter((i) => i.chave !== chave) }));
  }
  // Duração e sinal seguem a soma dos serviços até a pessoa editar à mão.
  function recalcular(v: AtendimentoFormulario): AtendimentoFormulario {
    const dur = v.itens.reduce((s, i) => s + (porId.get(i.servico_id)?.duracao_min ?? 0), 0);
    const sin = v.itens.reduce((s, i) => s + (porId.get(i.servico_id)?.sinal_centavos ?? 0), 0);
    return {
      ...v,
      duracao_min: v.duracaoManual ? v.duracao_min : String(dur || 60),
      sinal: v.sinalManual ? v.sinal : paraCampo(sin),
    };
  }

  return (
    <form ref={formulario} action={acao} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="cliente_id" value={f.cliente_id} />
      <input type="hidden" name="itens" value={JSON.stringify(f.itens.map(({ servico_id, valor }) => ({ servico_id, valor })))} />
      <input ref={forcar} type="hidden" name="forcar" value="0" />

      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.conflitos && (
        <div key={estado.rodada} role="alert" className="rounded-2xl border border-dourado bg-dourado/10 p-4">
          <p className="mb-2 flex items-center gap-2 font-semibold text-dourado-escuro">
            <TriangleAlert size={20} aria-hidden /> Esse horário encaixa com:
          </p>
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {estado.conflitos.map((c) => (
              <li key={c.id}>
                <span className="font-semibold tabular-nums">{c.inicio}–{c.fim}</span> {c.nome} · {c.servicos}
              </li>
            ))}
          </ul>
          <BotaoPrincipal
            type="button"
            className="w-full"
            disabled={enviando}
            onClick={() => {
              if (forcar.current) forcar.current.value = "1";
              formulario.current?.requestSubmit();
            }}
          >
            Marcar mesmo assim
          </BotaoPrincipal>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">Cliente</span>
        {cliente ? (
          <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-dourado bg-superficie px-4">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{cliente.nome}</span>
              {cliente.telefone && <span className="text-sm text-secundario tabular-nums">{formatarTelefone(cliente.telefone)}</span>}
            </span>
            <button type="button" onClick={() => setF({ ...f, cliente_id: "" })} aria-label="Trocar cliente" className="apertavel grid size-12 place-items-center rounded-xl">
              <X size={20} />
            </button>
          </div>
        ) : (
          <>
            <Buscador
              opcoes={clientes}
              texto={(c) => `${c.nome} ${c.telefone ?? ""}`}
              rotulo="Buscar cliente"
              placeholder="Nome ou telefone da cliente"
              aoEscolher={(c) => setF({ ...f, cliente_id: c.id })}
              linha={(c) => (
                <span className="flex flex-col">
                  <span className="font-medium">{c.nome}</span>
                  {c.telefone && <span className="text-sm text-secundario tabular-nums">{formatarTelefone(c.telefone)}</span>}
                </span>
              )}
            />
            <Link href="/clientes/nova" className="text-sm font-medium text-dourado-escuro underline underline-offset-4">
              Cadastrar cliente nova
            </Link>
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Data">
          <input type="date" name="data" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} className={estiloCampo} />
        </Campo>
        <Campo rotulo="Horário">
          <input type="time" name="hora" step={300} value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className={estiloCampo} />
        </Campo>
      </div>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">Procedimentos</span>
        {f.itens.length > 0 && (
          <ul className="flex flex-col gap-2">
            {f.itens.map((i, k) => {
              const s = porId.get(i.servico_id);
              const ruim = valores[k] === null;
              return (
                <li key={i.chave} className="flex items-center gap-2 rounded-2xl border border-linha p-2 pl-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s?.nome ?? "Serviço arquivado"}</span>
                    {s && <span className="text-sm text-secundario">{s.duracao_min} min</span>}
                  </span>
                  <label className="w-28">
                    <span className="sr-only">Valor de {s?.nome}</span>
                    <input
                      inputMode="decimal"
                      value={i.valor}
                      onChange={(e) => setF({ ...f, itens: f.itens.map((x) => (x.chave === i.chave ? { ...x, valor: e.target.value } : x)) })}
                      aria-invalid={ruim}
                      className={`h-12 w-full rounded-xl border px-3 text-right tabular-nums outline-none focus:border-dourado ${ruim ? "border-erro" : "border-linha"}`}
                    />
                  </label>
                  <button type="button" onClick={() => remover(i.chave)} aria-label={`Tirar ${s?.nome}`} className="apertavel grid size-12 shrink-0 place-items-center rounded-xl text-secundario hover:text-erro">
                    <X size={20} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Buscador
          opcoes={servicos}
          texto={(s) => s.nome}
          rotulo="Adicionar procedimento"
          placeholder={f.itens.length ? "Adicionar outro procedimento" : "Buscar procedimento"}
          aoEscolher={adicionar}
          linha={(s) => (
            <span className="flex w-full items-center gap-3">
              <Plus size={18} className="text-dourado-escuro" aria-hidden />
              <span className="flex-1 font-medium">{s.nome}</span>
              <span className="text-sm tabular-nums text-secundario">{formatarDinheiro(s.preco_centavos)}</span>
            </span>
          )}
        />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Desconto (R$)" erro={desconto === null ? "Valor não reconhecido." : undefined}>
          <input name="desconto" inputMode="decimal" value={f.desconto} onChange={(e) => setF({ ...f, desconto: e.target.value })} placeholder="0,00" className={`${estiloCampo} tabular-nums`} />
        </Campo>
        <Campo rotulo="Duração (min)" dica={f.duracaoManual && duracaoSoma ? `Soma dos serviços: ${duracaoSoma}` : undefined}>
          <input name="duracao_min" inputMode="numeric" value={f.duracao_min} onChange={(e) => setF({ ...f, duracao_min: e.target.value, duracaoManual: true })} className={`${estiloCampo} tabular-nums`} />
        </Campo>
      </div>

      <div className="flex items-baseline justify-between rounded-2xl bg-preto px-5 py-4 text-branco">
        <span className="text-sm text-secundario-escuro">Total</span>
        <span className="text-2xl font-semibold tabular-nums text-dourado">
          {valoresOk && total !== null && total >= 0 ? formatarDinheiro(total) : "—"}
        </span>
      </div>
      {total !== null && total < 0 && <Aviso tipo="erro">O desconto passou do total.</Aviso>}

      <Campo
        rotulo="Sinal de reserva (não reembolsável)"
        dica={f.sinalManual && sinalSoma ? `Soma dos serviços: ${formatarDinheiro(sinalSoma)}` : "Vem da soma dos sinais dos serviços."}
      >
        <input name="sinal" inputMode="decimal" value={f.sinal} onChange={(e) => setF({ ...f, sinal: e.target.value, sinalManual: true })} placeholder="0,00" className={`${estiloCampo} tabular-nums`} />
      </Campo>

      <Campo rotulo="Observações">
        <textarea name="observacoes" rows={2} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} className={`${estiloCampo} h-auto py-3`} />
      </Campo>

      <BotaoPrincipal type="submit" disabled={enviando} onClick={() => forcar.current && (forcar.current.value = "0")}>
        {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
        {enviando ? "Salvando…" : inicial.id ? "Salvar alterações" : "Marcar atendimento"}
      </BotaoPrincipal>
      {inicial.id && (
        <Link
          href={`/agenda/${inicial.id}`}
          className="apertavel flex h-12 items-center justify-center rounded-2xl border border-linha font-medium hover:bg-superficie"
        >
          Cancelar edição
        </Link>
      )}
    </form>
  );
}
