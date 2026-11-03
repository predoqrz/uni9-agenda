import Link from "next/link";
import type { AtendimentoResumo, Status } from "@/lib/agenda";
import { STATUS } from "@/lib/agenda";
import { formatarDinheiro } from "@/lib/nucleo";
import { partes } from "@/lib/tempo";

export const COR_STATUS: Record<Status, string> = {
  agendado: "bg-superficie text-dourado-escuro border-linha",
  confirmado: "bg-dourado/15 text-dourado-escuro border-dourado/40",
  realizado: "bg-preto text-dourado border-preto",
  faltou: "bg-erro/10 text-erro border-erro/30",
  cancelado: "bg-branco text-secundario border-linha line-through",
};

export function EtiquetaStatus({ status }: { status: Status }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold ${COR_STATUS[status]}`}>
      {STATUS[status]}
    </span>
  );
}

/** Um atendimento como cartão (no celular, nada de tabela larga). */
export function CartaoAtendimento({ a }: { a: AtendimentoResumo }) {
  const ini = partes(a.inicio);
  const fim = partes(a.fim);
  return (
    <Link
      href={`/agenda/${a.id}`}
      className="apertavel flex gap-4 rounded-2xl border border-linha px-4 py-3 hover:bg-superficie"
    >
      <span className="flex w-14 shrink-0 flex-col text-sm tabular-nums">
        <span className="font-semibold">{ini.hora}</span>
        <span className="text-secundario">{fim.hora}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`truncate font-medium ${a.status === "cancelado" ? "text-secundario line-through" : ""}`}>
          {a.cliente?.nome ?? "Cliente arquivada"}
        </span>
        <span className="truncate text-sm text-secundario">{a.servicos_resumo}</span>
        <span className="flex items-center gap-2">
          <EtiquetaStatus status={a.status} />
          <span className="text-sm tabular-nums text-secundario">{formatarDinheiro(a.valor_cobrado_centavos)}</span>
        </span>
      </span>
    </Link>
  );
}

/** Abas Mês / Dia / Lista no topo da agenda. */
export function AbasAgenda({ ativa, data }: { ativa: "mes" | "dia" | "lista"; data: string }) {
  const abas = [
    { id: "mes", rotulo: "Mês", href: `/agenda?mes=${data.slice(0, 7)}&dia=${data}` },
    { id: "dia", rotulo: "Dia", href: `/agenda/dia?data=${data}` },
    { id: "lista", rotulo: "Lista", href: `/agenda/lista?de=${data}` },
  ] as const;
  return (
    <nav aria-label="Visões da agenda" className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-superficie p-1">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          aria-current={ativa === a.id ? "page" : undefined}
          className={`apertavel flex h-11 items-center justify-center rounded-xl text-sm font-semibold ${ativa === a.id ? "bg-preto text-dourado" : "text-secundario"}`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
