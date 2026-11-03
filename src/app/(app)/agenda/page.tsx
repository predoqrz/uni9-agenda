import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BotaoFlutuante } from "@/components/ui";
import { atendimentosEntre, ocupaHorario } from "@/lib/agenda";
import {
  dataPorExtenso,
  diaDaSemana,
  diasNoMes,
  eData,
  hoje,
  instante,
  mesPorExtenso,
  partes,
  somarMeses,
} from "@/lib/tempo";
import { AbasAgenda, CartaoAtendimento } from "./componentes";

const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
  const sp = await searchParams;
  const hojeSP = hoje();
  const dia = eData(sp.dia) ? sp.dia : hojeSP;
  const mes = sp.mes && eData(`${sp.mes}-01`) ? sp.mes : dia.slice(0, 7);
  const selecionado = dia.startsWith(mes) ? dia : `${mes}-01`;

  const atendimentos = await atendimentosEntre(instante(`${mes}-01`), instante(`${somarMeses(mes, 1)}-01`));
  const porDia = new Map<string, number>();
  for (const a of atendimentos) {
    if (!ocupaHorario(a.status)) continue;
    const d = partes(a.inicio).data;
    porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const doDia = atendimentos.filter((a) => partes(a.inicio).data === selecionado);

  const vazios = diaDaSemana(`${mes}-01`);
  const total = diasNoMes(mes);
  const celulas: (string | null)[] = [
    ...Array<null>(vazios).fill(null),
    ...Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <>
      <AbasAgenda ativa="mes" data={selecionado} />

      <div className="mb-3 flex items-center justify-between">
        <Link href={`/agenda?mes=${somarMeses(mes, -1)}`} aria-label="Mês anterior" className="apertavel grid size-12 place-items-center rounded-xl hover:bg-superficie">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="font-marca text-xl font-semibold capitalize">{mesPorExtenso(mes)}</h1>
        <Link href={`/agenda?mes=${somarMeses(mes, 1)}`} aria-label="Próximo mês" className="apertavel grid size-12 place-items-center rounded-xl hover:bg-superficie">
          <ChevronRight size={22} />
        </Link>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-secundario" aria-hidden>
        {SEMANA.map((s, i) => (
          <span key={i} className="py-1">{s}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((d, i) => {
          if (!d) return <span key={`v${i}`} />;
          const n = porDia.get(d) ?? 0;
          const ativo = d === selecionado;
          const eHoje = d === hojeSP;
          return (
            <Link
              key={d}
              href={`/agenda?mes=${mes}&dia=${d}`}
              aria-label={`${dataPorExtenso(d)}${n ? `, ${n} atendimento(s)` : ""}`}
              aria-current={ativo ? "date" : undefined}
              className={`apertavel flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-sm tabular-nums ${ativo ? "bg-preto font-semibold text-dourado" : eHoje ? "border border-dourado font-semibold" : "hover:bg-superficie"}`}
            >
              {Number(d.slice(8))}
              <span className="flex h-1.5 gap-0.5">
                {Array.from({ length: Math.min(n, 3) }, (_, k) => (
                  <span key={k} className={`size-1.5 rounded-full ${ativo ? "bg-dourado" : "bg-dourado-escuro"}`} />
                ))}
              </span>
            </Link>
          );
        })}
      </div>

      <section className="entrada-painel mt-6 -mx-4 rounded-t-[28px] bg-superficie px-4 pt-6 pb-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold capitalize">{dataPorExtenso(selecionado)}</h2>
          <Link href={`/agenda/dia?data=${selecionado}`} className="apertavel rounded-xl px-3 py-3 text-sm font-semibold text-dourado-escuro">
            Abrir dia
          </Link>
        </div>
        {doDia.length === 0 ? (
          <p className="py-4 text-center text-secundario">Dia livre. Toque no + para marcar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {doDia.map((a) => (
              <li key={a.id} className="bg-branco rounded-2xl">
                <CartaoAtendimento a={a} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <BotaoFlutuante href={`/agenda/novo?data=${selecionado}`} rotulo="Novo atendimento" />
    </>
  );
}
