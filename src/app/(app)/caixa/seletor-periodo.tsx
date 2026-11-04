import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BotaoPrincipal, estiloCampo } from "@/components/ui";
import type { Periodo } from "@/lib/caixa";
import { dataCurta, hoje, mesPorExtenso, somarDias, somarMeses } from "@/lib/tempo";

/** Mês com setas, atalhos e período livre (ex.: 17/10 a 17/11). Funciona sem JavaScript. */
export function SeletorPeriodo({ periodo, base, extra = "" }: { periodo: Periodo; base: string; extra?: string }) {
  const h = hoje();
  const mes = periodo.mes ?? periodo.ate.slice(0, 7);
  const sufixo = extra ? `&${extra}` : "";
  const atalhos = [
    { rotulo: "Este mês", href: `${base}?mes=${h.slice(0, 7)}${sufixo}` },
    { rotulo: "Mês passado", href: `${base}?mes=${somarMeses(h.slice(0, 7), -1)}${sufixo}` },
    { rotulo: "Últimos 30 dias", href: `${base}?de=${somarDias(h, -29)}&ate=${h}${sufixo}` },
    { rotulo: "Do dia 17 ao 17", href: `${base}?de=${somarMeses(h.slice(0, 7), h.slice(8) >= "17" ? 0 : -1)}-17&ate=${somarDias(`${somarMeses(h.slice(0, 7), h.slice(8) >= "17" ? 1 : 0)}-17`, -1)}${sufixo}` },
  ];

  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link href={`${base}?mes=${somarMeses(mes, -1)}${sufixo}`} aria-label="Mês anterior" className="apertavel grid size-12 place-items-center rounded-xl hover:bg-superficie">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-center font-marca text-xl font-semibold capitalize">
          {periodo.mes ? mesPorExtenso(periodo.mes) : `${dataCurta(periodo.de)} a ${dataCurta(periodo.ate)}`}
        </h1>
        <Link href={`${base}?mes=${somarMeses(mes, 1)}${sufixo}`} aria-label="Próximo mês" className="apertavel grid size-12 place-items-center rounded-xl hover:bg-superficie">
          <ChevronRight size={22} />
        </Link>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {atalhos.map((a) => (
          <Link key={a.rotulo} href={a.href} className="apertavel flex h-10 shrink-0 items-center rounded-full border border-linha px-4 text-sm font-medium hover:bg-superficie">
            {a.rotulo}
          </Link>
        ))}
      </div>
      <details className="rounded-2xl border border-linha px-4">
        <summary className="flex h-12 cursor-pointer items-center text-sm font-medium">Período livre</summary>
        <form action={base} className="grid grid-cols-2 gap-3 pb-4">
          {extra.split("&").filter(Boolean).map((par) => {
            const [k, v] = par.split("=");
            return <input key={k} type="hidden" name={k} value={v} />;
          })}
          <input type="date" name="de" defaultValue={periodo.de} aria-label="De" className={estiloCampo} />
          <input type="date" name="ate" defaultValue={periodo.ate} aria-label="Até" className={estiloCampo} />
          <BotaoPrincipal type="submit" className="col-span-2">Ver período</BotaoPrincipal>
        </form>
      </details>
    </div>
  );
}
