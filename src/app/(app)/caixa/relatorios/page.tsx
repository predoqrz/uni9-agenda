import Link from "next/link";
import { lerPeriodo } from "@/lib/caixa";
import { formatarDinheiro, repartirDinheiro } from "@/lib/nucleo";
import { buscarTodos } from "@/lib/supabase/buscar-todos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { dataCurta, instante, partes, somarDias } from "@/lib/tempo";
import { SeletorPeriodo } from "../seletor-periodo";

type Realizado = {
  id: string;
  inicio: string;
  cliente_id: string;
  desconto_centavos: number;
  cliente: { nome: string } | null;
  itens: { servico_id: string; valor_centavos: number; custo_centavos: number; deleted_at: string | null; servico: { nome: string } | null }[];
};

type Linha = { nome: string; quantidade: number; faturamento: number; lucro: number };

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ mes?: string; de?: string; ate?: string }> }) {
  const periodo = lerPeriodo(await searchParams);
  const supabase = await criarClienteServidor();
  const fimExclusivo = instante(somarDias(periodo.ate, 1)).toISOString();

  const [realizados, primeiros] = await Promise.all([
    buscarTodos<Realizado>((a, b) =>
      supabase
        .from("atendimentos")
        .select("id, inicio, cliente_id, desconto_centavos, cliente:clientes(nome), itens:atendimento_itens(servico_id, valor_centavos, custo_centavos, deleted_at, servico:servicos(nome))")
        .is("deleted_at", null)
        .eq("status", "realizado")
        .gte("inicio", instante(periodo.de).toISOString())
        .lt("inicio", fimExclusivo)
        .order("inicio")
        .range(a, b)
        .overrideTypes<Realizado[], { merge: false }>(),
    ),
    // Todos os realizados até o fim do período, para achar o primeiro de cada cliente.
    buscarTodos<{ cliente_id: string; inicio: string }>((a, b) =>
      supabase
        .from("atendimentos")
        .select("cliente_id, inicio")
        .is("deleted_at", null)
        .eq("status", "realizado")
        .lt("inicio", fimExclusivo)
        .order("inicio")
        .order("id")
        .range(a, b),
    ),
  ]);

  // Clientes novas: o primeiro atendimento realizado da vida caiu no período.
  const primeiroDe = new Map<string, string>();
  for (const p of primeiros) if (!primeiroDe.has(p.cliente_id)) primeiroDe.set(p.cliente_id, p.inicio);
  const novas = new Map<string, { nome: string; data: string }>();
  for (const r of realizados) {
    if (primeiroDe.get(r.cliente_id) === r.inicio && !novas.has(r.cliente_id)) {
      novas.set(r.cliente_id, { nome: r.cliente?.nome ?? "Cliente", data: partes(r.inicio).data });
    }
  }

  // Procedimentos: o desconto do atendimento é repartido entre os itens pelo núcleo C.
  const porServico = new Map<string, Linha>();
  for (const r of realizados) {
    const itens = r.itens.filter((i) => !i.deleted_at);
    if (itens.length === 0) continue;
    const descontos = repartirDinheiro(r.desconto_centavos, itens.map((i) => i.valor_centavos));
    itens.forEach((i, k) => {
      const linha = porServico.get(i.servico_id) ?? { nome: i.servico?.nome ?? "Serviço", quantidade: 0, faturamento: 0, lucro: 0 };
      const faturado = i.valor_centavos - descontos[k];
      linha.quantidade += 1;
      linha.faturamento += faturado;
      linha.lucro += faturado - i.custo_centavos;
      porServico.set(i.servico_id, linha);
    });
  }
  const ranking = [...porServico.values()].sort((a, b) => b.quantidade - a.quantidade || b.faturamento - a.faturamento);
  const totais = ranking.reduce((t, l) => ({ q: t.q + l.quantidade, f: t.f + l.faturamento, l: t.l + l.lucro }), { q: 0, f: 0, l: 0 });
  const maior = Math.max(1, ...ranking.map((l) => l.quantidade));

  return (
    <>
      <SeletorPeriodo periodo={periodo} base="/caixa/relatorios" />

      <dl className="mb-6 grid grid-cols-2 gap-3">
        {[
          ["Atendimentos realizados", String(realizados.length)],
          ["Clientes novas", String(novas.size)],
          ["Faturamento", formatarDinheiro(totais.f)],
          ["Lucro estimado", formatarDinheiro(totais.l)],
        ].map(([r, v]) => (
          <div key={r} className="rounded-2xl bg-superficie p-4">
            <dt className="text-sm text-secundario">{r}</dt>
            <dd className="text-xl font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mb-8">
        <h2 className="mb-1 font-semibold">Ranking de procedimentos</h2>
        <p className="mb-3 text-sm text-secundario">Por quantidade. Desconto repartido proporcionalmente entre os procedimentos; lucro = faturado − custo de material.</p>
        {ranking.length === 0 ? (
          <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Nenhum atendimento realizado no período.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {ranking.map((l, i) => (
              <li key={l.nome} className="rounded-2xl border border-linha p-4">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    <span className="mr-2 text-secundario tabular-nums">{i + 1}.</span>
                    {l.nome}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{l.quantidade}×</span>
                </div>
                <div className="mb-2 h-2 rounded-full bg-superficie" aria-hidden>
                  <div className="h-2 rounded-full bg-dourado" style={{ width: `${(l.quantidade / maior) * 100}%` }} />
                </div>
                <p className="flex justify-between text-sm tabular-nums text-secundario">
                  <span>Faturou {formatarDinheiro(l.faturamento)}</span>
                  <span>Lucro {formatarDinheiro(l.lucro)}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Clientes novas ({novas.size})</h2>
        {novas.size === 0 ? (
          <p className="text-secundario">Nenhuma no período.</p>
        ) : (
          <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
            {[...novas].map(([id, c]) => (
              <li key={id}>
                <Link href={`/clientes/${id}`} className="flex min-h-14 items-center justify-between px-4 hover:bg-superficie">
                  <span className="font-medium">{c.nome}</span>
                  <span className="text-sm text-secundario tabular-nums">{dataCurta(c.data)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
