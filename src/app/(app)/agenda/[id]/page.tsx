import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Pencil } from "lucide-react";
import { BotaoSecundario } from "@/components/ui";
import { STATUS, type Status } from "@/lib/agenda";
import { formatarDinheiro } from "@/lib/nucleo";
import { formatarTelefone } from "@/lib/telefone";
import { dataPorExtenso, partes } from "@/lib/tempo";
import { arquivarAtendimento, mudarStatus, registrarSinal, type FormaPagamento } from "../acoes";
import { EtiquetaStatus } from "../componentes";
import { carregarAtendimento } from "./dados";

const FORMAS: Record<FormaPagamento, string> = { pix: "Pix", dinheiro: "Dinheiro", debito: "Débito", credito: "Crédito" };

export default async function DetalheAtendimento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await carregarAtendimento(id);
  if (!a) notFound();

  const ini = partes(a.inicio);
  const fim = partes(a.fim);
  const sinalPago = a.sinal_pago_em !== null;
  // Sinal não é reembolsável: no dia, só falta o restante.
  const falta = Math.max(0, a.valor_cobrado_centavos - (sinalPago ? a.sinal_centavos : 0));

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium capitalize text-secundario">{dataPorExtenso(ini.data)}</p>
          <h1 className="font-marca text-2xl font-semibold tabular-nums">
            {ini.hora}–{fim.hora}
          </h1>
        </div>
        <Link
          href={`/agenda/${a.id}/editar`}
          className="apertavel flex h-12 items-center gap-2 rounded-2xl border border-linha px-4 font-medium hover:bg-superficie"
        >
          <Pencil size={18} aria-hidden /> Editar
        </Link>
      </div>

      <section className="mb-5 rounded-2xl border border-linha p-4">
        <p className="text-lg font-semibold">{a.cliente?.nome ?? "Cliente arquivada"}</p>
        {a.cliente?.telefone && (
          <a
            href={`https://wa.me/55${a.cliente.telefone}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex h-12 items-center gap-2 font-medium text-dourado-escuro"
          >
            <MessageCircle size={18} aria-hidden /> {formatarTelefone(a.cliente.telefone)}
          </a>
        )}
        <ul className="mt-3 divide-y divide-linha">
          {a.itens.map((i) => (
            <li key={i.id} className="flex justify-between py-2">
              <span>{i.servico?.nome ?? "Serviço"}</span>
              <span className="tabular-nums">{formatarDinheiro(i.valor_centavos)}</span>
            </li>
          ))}
          {a.desconto_centavos > 0 && (
            <li className="flex justify-between py-2 text-secundario">
              <span>Desconto</span>
              <span className="tabular-nums">−{formatarDinheiro(a.desconto_centavos)}</span>
            </li>
          )}
          <li className="flex justify-between py-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatarDinheiro(a.valor_cobrado_centavos)}</span>
          </li>
        </ul>
        {a.observacoes && <p className="mt-2 text-sm text-secundario">{a.observacoes}</p>}
      </section>

      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          Status <EtiquetaStatus status={a.status} />
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(STATUS) as Status[]).map((s) => (
            <form key={s} action={mudarStatus.bind(null, a.id, s)}>
              <button
                disabled={a.status === s}
                className={`apertavel h-12 w-full rounded-2xl border text-sm font-semibold ${a.status === s ? "border-preto bg-preto text-dourado" : "border-linha hover:bg-superficie"}`}
              >
                {STATUS[s]}
              </button>
            </form>
          ))}
        </div>
      </section>

      {a.sinal_centavos > 0 && (
        <section className="mb-5 rounded-2xl bg-superficie p-4">
          <h2 className="mb-1 font-semibold">Sinal de reserva: {formatarDinheiro(a.sinal_centavos)}</h2>
          {sinalPago ? (
            <>
              <p className="text-sm text-secundario">
                Pago por {FORMAS[a.sinal_forma!]} em {dataPorExtenso(partes(a.sinal_pago_em!).data)}. Não é reembolsável.
              </p>
              <form action={registrarSinal.bind(null, a.id, null)} className="mt-2">
                <button className="apertavel h-12 text-sm font-medium text-secundario underline underline-offset-4">Desfazer pagamento do sinal</button>
              </form>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-secundario">Ainda não pago. Toque na forma de pagamento:</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(FORMAS) as FormaPagamento[]).map((forma) => (
                  <form key={forma} action={registrarSinal.bind(null, a.id, forma)}>
                    <button className="apertavel h-12 w-full rounded-2xl bg-dourado text-sm font-semibold text-preto">
                      Sinal pago · {FORMAS[forma]}
                    </button>
                  </form>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <div className="mb-8 flex items-baseline justify-between rounded-2xl bg-preto px-5 py-4 text-branco">
        <span className="text-sm text-secundario-escuro">Falta cobrar no dia</span>
        <span className="text-2xl font-semibold tabular-nums text-dourado">{formatarDinheiro(falta)}</span>
      </div>

      <form action={arquivarAtendimento.bind(null, a.id, ini.data)}>
        <BotaoSecundario className="w-full">Arquivar atendimento</BotaoSecundario>
        <p className="mt-2 text-center text-sm text-secundario">Some da agenda. Nada é apagado.</p>
      </form>
    </>
  );
}
