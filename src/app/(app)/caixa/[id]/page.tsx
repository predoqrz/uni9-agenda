import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoSecundario, Titulo } from "@/components/ui";
import type { Lancamento } from "@/lib/caixa";
import { formatarDinheiro } from "@/lib/nucleo";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { dataPorExtenso } from "@/lib/tempo";
import { arquivarLancamento } from "../acoes";
import { FormularioLancamento } from "../formularios";

const ORIGENS = { atendimento: "atendimento realizado", sinal: "sinal de reserva pago", recorrencia: "conta fixa", importacao: "importação" };

export default async function EditarLancamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await criarClienteServidor();
  const { data: l } = await supabase
    .from("lancamentos")
    .select("id, tipo, esfera, esfera_origem, valor_centavos, data, descricao, categoria, forma_pagamento, origem, origem_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<Lancamento, { merge: false }>();
  if (!l) notFound();

  if (l.origem !== "manual") {
    const daAgenda = l.origem === "atendimento" || l.origem === "sinal";
    return (
      <>
        <Titulo>Lançamento automático</Titulo>
        <div className="mb-6 rounded-2xl border border-linha p-4">
          <p className="text-2xl font-semibold tabular-nums">{formatarDinheiro(l.valor_centavos)}</p>
          <p className="capitalize text-secundario">{dataPorExtenso(l.data, true)}</p>
          <p className="mt-2">{l.descricao}</p>
          <p className="mt-2 text-sm text-secundario">Veio de {ORIGENS[l.origem]}.</p>
        </div>
        {daAgenda && l.origem_id ? (
          <Link href={`/agenda/${l.origem_id}`} className="apertavel flex h-14 items-center justify-center rounded-2xl bg-dourado font-semibold text-preto">
            Abrir o atendimento
          </Link>
        ) : (
          <form action={arquivarLancamento.bind(null, l.id, l.data)}>
            <BotaoSecundario className="w-full">Arquivar este mês</BotaoSecundario>
            <p className="mt-2 text-center text-sm text-secundario">A conta fixa continua nos outros meses.</p>
          </form>
        )}
        {daAgenda && <p className="mt-3 text-center text-sm text-secundario">Para mudar, altere o status ou o sinal no atendimento.</p>}
      </>
    );
  }

  return (
    <>
      <Titulo>Editar lançamento</Titulo>
      <FormularioLancamento
        id={l.id}
        inicial={{
          tipo: l.tipo,
          esfera: l.esfera,
          valor: formatarDinheiro(l.valor_centavos).replace("R$ ", ""),
          data: l.data,
          descricao: l.descricao,
          categoria: l.categoria,
          forma_pagamento: l.forma_pagamento ?? "",
        }}
      />
      <form action={arquivarLancamento.bind(null, l.id, l.data)} className="mt-8">
        <BotaoSecundario className="w-full">Arquivar lançamento</BotaoSecundario>
        <p className="mt-2 text-center text-sm text-secundario">Some do caixa. Nada é apagado.</p>
      </form>
    </>
  );
}
