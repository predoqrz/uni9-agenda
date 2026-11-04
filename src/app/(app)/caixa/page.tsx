import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Repeat } from "lucide-react";
import { Aviso, BotaoFlutuante } from "@/components/ui";
import { buscarTodos } from "@/lib/supabase/buscar-todos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { efeito, lerPeriodo, linkPeriodo, recorrenciasPrevistas, type Esfera, type Lancamento, type Recorrencia } from "@/lib/caixa";
import { formatarDinheiro } from "@/lib/nucleo";
import { dataCurta, hoje, instante, partes, somarDias } from "@/lib/tempo";
import { agrupar, COR_ENTRADA, COR_SAIDA, GraficoBarras } from "./grafico-barras";
import { SeletorPeriodo } from "./seletor-periodo";

type AtendimentoCaixa = {
  id: string;
  inicio: string;
  status: string;
  valor_cobrado_centavos: number;
  custo_material_centavos: number;
  sinal_centavos: number;
  sinal_pago_em: string | null;
};

const ICONES = { entrada: ArrowDownLeft, saida: ArrowUpRight, transferencia: ArrowLeftRight };

export default async function PaginaCaixa({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; de?: string; ate?: string; esfera?: string }>;
}) {
  const sp = await searchParams;
  const periodo = lerPeriodo(sp);
  const esfera: Esfera | null = sp.esfera === "empresa" || sp.esfera === "pessoal" ? sp.esfera : null;
  const supabase = await criarClienteServidor();

  // Contas fixas vencidas viram lançamento (sem duplicar). Falhar aqui não impede de ver o caixa.
  const { error: erroRecorrencias } = await supabase.rpc("gerar_recorrencias", { p_ate: hoje() });

  const [lancamentos, atendimentos, recorrencias] = await Promise.all([
    buscarTodos<Lancamento>((a, b) =>
      supabase
        .from("lancamentos")
        .select("id, tipo, esfera, esfera_origem, valor_centavos, data, descricao, categoria, forma_pagamento, origem, origem_id")
        .is("deleted_at", null)
        .gte("data", periodo.de)
        .lte("data", periodo.ate)
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false })
        .range(a, b),
    ),
    buscarTodos<AtendimentoCaixa>((a, b) =>
      supabase
        .from("atendimentos")
        .select("id, inicio, status, valor_cobrado_centavos, custo_material_centavos, sinal_centavos, sinal_pago_em")
        .is("deleted_at", null)
        .in("status", ["agendado", "confirmado", "realizado"])
        .gte("inicio", instante(periodo.de).toISOString())
        .lt("inicio", instante(somarDias(periodo.ate, 1)).toISOString())
        .order("inicio")
        .range(a, b),
    ),
    buscarTodos<Recorrencia>((a, b) =>
      supabase
        .from("recorrencias")
        .select("id, tipo, esfera, valor_centavos, descricao, categoria, dia_mes, comeca_em, ativo")
        .is("deleted_at", null)
        .order("dia_mes")
        .range(a, b),
    ),
  ]);

  // Real: só o que já aconteceu no caixa.
  const visiveis = lancamentos.filter((l) => efeito(l, esfera) !== 0 || (esfera === null && l.tipo === "transferencia"));
  const entradas = lancamentos.reduce((s, l) => s + Math.max(0, efeito(l, esfera)), 0);
  const saidas = lancamentos.reduce((s, l) => s + Math.max(0, -efeito(l, esfera)), 0);
  const saldo = entradas - saidas;
  const real = agrupar(
    periodo.de,
    periodo.ate,
    lancamentos.flatMap((l) => {
      const e = efeito(l, esfera);
      return e === 0 ? [] : [{ data: l.data, valor: Math.abs(e), serie: e > 0 ? 0 : 1 }];
    }),
    2,
  );

  // Previsão: separada do real. A receber = agendado + confirmado, menos sinais já pagos.
  const pendentes = atendimentos.filter((a) => a.status === "agendado" || a.status === "confirmado");
  const contaEmpresa = esfera !== "pessoal"; // a receita de atendimento é da empresa
  const aReceber = contaEmpresa
    ? pendentes.reduce((s, a) => s + Math.max(0, a.valor_cobrado_centavos - (a.sinal_pago_em ? a.sinal_centavos : 0)), 0)
    : 0;
  const previstas = recorrenciasPrevistas(recorrencias, periodo).filter((p) => esfera === null || p.r.esfera === esfera);
  const fixasEntrada = previstas.filter((p) => p.r.tipo === "entrada").reduce((s, p) => s + p.r.valor_centavos, 0);
  const fixasSaida = previstas.filter((p) => p.r.tipo === "saida").reduce((s, p) => s + p.r.valor_centavos, 0);
  const saldoPrevisto = saldo + aReceber + fixasEntrada - fixasSaida;
  const previsto = agrupar(
    periodo.de,
    periodo.ate,
    contaEmpresa
      ? pendentes.map((a) => ({
          data: partes(a.inicio).data,
          valor: Math.max(0, a.valor_cobrado_centavos - (a.sinal_pago_em ? a.sinal_centavos : 0)),
          serie: 0,
        }))
      : [],
    1,
  );

  // Capital de giro (empresa).
  const realizados = atendimentos.filter((a) => a.status === "realizado");
  const sinaisRecebidos = lancamentos.filter((l) => l.origem === "sinal").reduce((s, l) => s + l.valor_centavos, 0);
  const faturamento = realizados.reduce((s, a) => s + a.valor_cobrado_centavos, 0);
  const custoMaterial = realizados.reduce((s, a) => s + a.custo_material_centavos, 0);

  const q = linkPeriodo(periodo);
  const filtros = [
    { rotulo: "Tudo", valor: null },
    { rotulo: "Empresa", valor: "empresa" },
    { rotulo: "Pessoal", valor: "pessoal" },
  ] as const;

  return (
    <>
      <SeletorPeriodo periodo={periodo} base="/caixa" extra={esfera ? `esfera=${esfera}` : ""} />

      <nav aria-label="Esfera" className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-superficie p-1">
        {filtros.map((f) => (
          <Link
            key={f.rotulo}
            href={`/caixa?${q}${f.valor ? `&esfera=${f.valor}` : ""}`}
            aria-current={esfera === f.valor ? "page" : undefined}
            className={`apertavel flex h-11 items-center justify-center rounded-xl text-sm font-semibold ${esfera === f.valor ? "bg-preto text-dourado" : "text-secundario"}`}
          >
            {f.rotulo}
          </Link>
        ))}
      </nav>

      {erroRecorrencias && (
        <div className="mb-4">
          <Aviso tipo="erro">Não deu para lançar as contas fixas agora. O resto do caixa está certo.</Aviso>
        </div>
      )}

      <section className="mb-6 rounded-2xl bg-preto p-5 text-branco">
        <p className="text-sm text-secundario-escuro">Saldo do período{esfera ? ` · ${esfera}` : ""}</p>
        <p className={`text-3xl font-semibold tabular-nums ${saldo < 0 ? "text-erro-escuro" : "text-dourado"}`}>{formatarDinheiro(saldo)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <p>
            <span className="block text-secundario-escuro">Entradas</span>
            <span className="tabular-nums">{formatarDinheiro(entradas)}</span>
          </p>
          <p>
            <span className="block text-secundario-escuro">Saídas</span>
            <span className="tabular-nums">{formatarDinheiro(saidas)}</span>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <GraficoBarras
          titulo="Real: entradas e saídas"
          rotulos={real.rotulos}
          series={[
            { nome: "Entradas", cor: COR_ENTRADA, valores: real.valores[0] },
            { nome: "Saídas", cor: COR_SAIDA, valores: real.valores[1] },
          ]}
        />
      </section>

      <section className="mb-8 rounded-2xl border border-dashed border-dourado p-4">
        <h2 className="mb-1 font-semibold">Previsão (ainda não aconteceu)</h2>
        <p className="mb-4 text-sm text-secundario">Fica separada do saldo real.</p>
        <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-secundario">A receber (agenda)</dt>
            <dd className="font-semibold tabular-nums">{formatarDinheiro(aReceber)}</dd>
          </div>
          <div>
            <dt className="text-secundario">Contas fixas a vencer</dt>
            <dd className="font-semibold tabular-nums">
              {fixasEntrada ? `+${formatarDinheiro(fixasEntrada)} ` : ""}−{formatarDinheiro(fixasSaida)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-secundario">Saldo previsto no fim do período</dt>
            <dd className={`text-xl font-semibold tabular-nums ${saldoPrevisto < 0 ? "text-erro" : ""}`}>{formatarDinheiro(saldoPrevisto)}</dd>
          </div>
        </dl>
        {aReceber > 0 && (
          <GraficoBarras titulo="A receber por dia" rotulos={previsto.rotulos} series={[{ nome: "A receber", cor: COR_ENTRADA, valores: previsto.valores[0] }]} />
        )}
        {previstas.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {previstas.map((p) => (
              <li key={`${p.r.id}-${p.data}`} className="flex justify-between">
                <span>{dataCurta(p.data)} · {p.r.descricao}</span>
                <span className="tabular-nums">{p.r.tipo === "saida" ? "−" : "+"}{formatarDinheiro(p.r.valor_centavos)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {esfera !== "pessoal" && (
        <section className="mb-8 rounded-2xl bg-superficie p-4">
          <h2 className="mb-3 font-semibold">Capital de giro</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-secundario">Sinais recebidos</dt>
              <dd className="font-semibold tabular-nums">{formatarDinheiro(sinaisRecebidos)}</dd>
            </div>
            <div>
              <dt className="text-secundario">Faturamento realizado</dt>
              <dd className="font-semibold tabular-nums">{formatarDinheiro(faturamento)}</dd>
            </div>
            <div>
              <dt className="text-secundario">Custo de material</dt>
              <dd className="font-semibold tabular-nums">{formatarDinheiro(custoMaterial)}</dd>
            </div>
            <div>
              <dt className="text-secundario">Lucro estimado</dt>
              <dd className="font-semibold tabular-nums">{formatarDinheiro(faturamento - custoMaterial)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-secundario">
            O custo de material é calculado, não sai do caixa: a compra do material já é uma saída.
          </p>
          {custoMaterial > 0 && (
            <p className="mt-3 rounded-xl bg-branco px-4 py-3 font-medium text-dourado-escuro">
              Reserve {formatarDinheiro(custoMaterial)} para repor material.
            </p>
          )}
        </section>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Lançamentos</h2>
        <div className="flex gap-1">
          <Link href="/caixa/contas-fixas" className="apertavel flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-medium text-dourado-escuro">
            <Repeat size={16} aria-hidden /> Contas fixas
          </Link>
          <Link href={`/caixa/relatorios?${q}`} className="apertavel flex h-11 items-center rounded-xl px-3 text-sm font-medium text-dourado-escuro">
            Relatórios
          </Link>
        </div>
      </div>
      {visiveis.length === 0 ? (
        <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Nenhum lançamento no período.</p>
      ) : (
        <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
          {visiveis.map((l) => {
            const Icone = ICONES[l.tipo];
            const e = esfera ? efeito(l, esfera) : l.tipo === "saida" ? -l.valor_centavos : l.valor_centavos;
            return (
              <li key={l.id}>
                <Link href={`/caixa/${l.id}`} className="apertavel flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-superficie">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${l.tipo === "entrada" ? "bg-dourado/15 text-dourado-escuro" : l.tipo === "saida" ? "bg-[#6B4E9B]/15 text-[#6B4E9B]" : "bg-superficie text-secundario"}`}>
                    <Icone size={18} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{l.descricao || l.categoria || "Sem descrição"}</span>
                    <span className="text-sm text-secundario">
                      {dataCurta(l.data)} · {l.tipo === "transferencia" ? `${l.esfera_origem} → ${l.esfera}` : l.esfera}
                      {l.categoria ? ` · ${l.categoria}` : ""}
                    </span>
                  </span>
                  <span className={`font-semibold tabular-nums ${l.tipo === "transferencia" && !esfera ? "text-secundario" : ""}`}>
                    {l.tipo === "transferencia" && !esfera ? "" : e < 0 ? "−" : "+"}
                    {formatarDinheiro(l.valor_centavos)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <BotaoFlutuante href="/caixa/novo" rotulo="Novo lançamento" />
    </>
  );
}
