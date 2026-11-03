import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BotaoFlutuante } from "@/components/ui";
import { atendimentosEntre, ocupaHorario } from "@/lib/agenda";
import { colunasDoDia, formatarDinheiro } from "@/lib/nucleo";
import { dataPorExtenso, eData, emMinutos, hoje, instante, partes, somarDias } from "@/lib/tempo";
import { AbasAgenda, COR_STATUS } from "../componentes";
import { LinhaAgora } from "./linha-agora";

const PX_POR_MINUTO = 1.6; // 30 min = 48px: alvo de toque confortável
const INICIO_PADRAO = 7 * 60 + 30;
const FIM_PADRAO = 20 * 60;

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export default async function VisaoDoDia({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams;
  const data = eData(sp.data) ? sp.data : hoje();
  const meiaNoite = instante(data);
  const atendimentos = await atendimentosEntre(meiaNoite, instante(somarDias(data, 1)));

  // Minutos dentro do dia (um atendimento que vira a noite é cortado na grade).
  const base = emMinutos(meiaNoite);
  const blocos = atendimentos.map((a) => ({
    a,
    ini: Math.max(0, emMinutos(a.inicio) - base),
    fim: Math.min(24 * 60, emMinutos(a.fim) - base),
  }));

  // A grade estica para caber tudo, arredondando para meia hora.
  const inicioGrade = Math.min(INICIO_PADRAO, ...blocos.map((b) => Math.floor(b.ini / 30) * 30));
  const fimGrade = Math.max(FIM_PADRAO, ...blocos.map((b) => Math.ceil(b.fim / 30) * 30));

  // Encaixes lado a lado pelo núcleo C. Cancelados e faltas ficam por baixo, sem empurrar ninguém.
  const ativos = blocos.filter((b) => ocupaHorario(b.a.status));
  const layout = colunasDoDia(ativos.map((b) => ({ inicio: b.ini, fim: b.fim })));
  const posicao = new Map(ativos.map((b, i) => [b.a.id, layout[i]]));

  const slots: number[] = [];
  for (let m = inicioGrade; m < fimGrade; m += 30) slots.push(m);
  const altura = (fimGrade - inicioGrade) * PX_POR_MINUTO;

  return (
    <>
      <AbasAgenda ativa="dia" data={data} />
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/agenda/dia?data=${somarDias(data, -1)}`} aria-label="Dia anterior" className="apertavel grid size-12 place-items-center rounded-xl hover:bg-superficie">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-center text-lg font-semibold capitalize">{dataPorExtenso(data)}</h1>
        <Link href={`/agenda/dia?data=${somarDias(data, 1)}`} aria-label="Próximo dia" className="apertavel grid size-12 place-items-center rounded-xl hover:bg-superficie">
          <ChevronRight size={22} />
        </Link>
      </div>

      <div className="relative" style={{ height: altura }}>
        {/* Horários vazios: tocar abre o novo atendimento naquele horário */}
        {slots.map((m) => (
          <Link
            key={m}
            href={`/agenda/novo?data=${data}&hora=${hhmm(m)}`}
            aria-label={`Marcar às ${hhmm(m)}`}
            className="absolute right-0 left-0 flex border-t border-linha hover:bg-superficie/60"
            style={{ top: (m - inicioGrade) * PX_POR_MINUTO, height: 30 * PX_POR_MINUTO }}
          >
            <span className={`w-14 -translate-y-2.5 bg-branco pr-2 text-right text-xs tabular-nums ${m % 60 === 0 ? "text-preto font-semibold" : "text-secundario"}`}>
              {m % 60 === 0 || m === inicioGrade ? hhmm(m) : ""}
            </span>
          </Link>
        ))}

        {/* Atendimentos com altura proporcional à duração */}
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 left-14">
          {blocos.map(({ a, ini, fim }) => {
            const p = posicao.get(a.id) ?? { coluna: 0, colunas: 1 };
            const ocupa = ocupaHorario(a.status);
            const alturaBloco = Math.max((fim - ini) * PX_POR_MINUTO - 2, 22);
            return (
              <Link
                key={a.id}
                href={`/agenda/${a.id}`}
                className={`apertavel pointer-events-auto absolute overflow-hidden rounded-xl border px-2 py-1 text-left text-xs shadow-[0_4px_12px_-6px_rgba(17,17,17,0.25)] ${COR_STATUS[a.status]} ${ocupa ? "" : "opacity-60"}`}
                style={{
                  top: (ini - inicioGrade) * PX_POR_MINUTO + 1,
                  height: alturaBloco,
                  left: `calc(${(p.coluna / p.colunas) * 100}% + 2px)`,
                  width: `calc(${100 / p.colunas}% - 4px)`,
                  zIndex: ocupa ? 2 : 1,
                }}
              >
                <span className="block truncate font-semibold">{a.cliente?.nome ?? "Cliente arquivada"}</span>
                {alturaBloco > 40 && (
                  <span className="block truncate opacity-80">
                    {partes(a.inicio).hora}–{partes(a.fim).hora} · {a.servicos_resumo}
                  </span>
                )}
                {alturaBloco > 60 && <span className="block truncate tabular-nums opacity-80">{formatarDinheiro(a.valor_cobrado_centavos)}</span>}
              </Link>
            );
          })}
        </div>

        {data === hoje() && <LinhaAgora inicioGrade={inicioGrade} fimGrade={fimGrade} pxPorMinuto={PX_POR_MINUTO} />}
      </div>

      <BotaoFlutuante href={`/agenda/novo?data=${data}`} rotulo="Novo atendimento" />
    </>
  );
}
