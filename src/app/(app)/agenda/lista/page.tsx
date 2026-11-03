import { BotaoFlutuante, BotaoPrincipal, Campo, estiloCampo } from "@/components/ui";
import { atendimentosEntre } from "@/lib/agenda";
import { formatarDinheiro } from "@/lib/nucleo";
import { dataPorExtenso, eData, hoje, instante, partes, somarDias } from "@/lib/tempo";
import { AbasAgenda, CartaoAtendimento } from "../componentes";

export default async function ListaPorPeriodo({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const sp = await searchParams;
  const de = eData(sp.de) ? sp.de : hoje();
  let ate = eData(sp.ate) ? sp.ate : somarDias(de, 6);
  if (ate < de) ate = de;
  if (somarDias(de, 366) < ate) ate = somarDias(de, 366); // no máximo um ano por vez

  const atendimentos = await atendimentosEntre(instante(de), instante(somarDias(ate, 1)));
  const grupos = new Map<string, typeof atendimentos>();
  for (const a of atendimentos) {
    const d = partes(a.inicio).data;
    if (d < de || d > ate) continue;
    grupos.set(d, [...(grupos.get(d) ?? []), a]);
  }
  const previsto = atendimentos
    .filter((a) => a.status === "agendado" || a.status === "confirmado" || a.status === "realizado")
    .reduce((s, a) => s + a.valor_cobrado_centavos, 0);

  return (
    <>
      <AbasAgenda ativa="lista" data={de} />
      <form className="mb-5 grid grid-cols-2 gap-3">
        <Campo rotulo="De">
          <input type="date" name="de" defaultValue={de} className={estiloCampo} />
        </Campo>
        <Campo rotulo="Até">
          <input type="date" name="ate" defaultValue={ate} className={estiloCampo} />
        </Campo>
        <BotaoPrincipal type="submit" className="col-span-2">Ver período</BotaoPrincipal>
      </form>

      <p className="mb-4 text-sm text-secundario">
        {atendimentos.length} atendimento(s) · {formatarDinheiro(previsto)} em agendados, confirmados e realizados
      </p>

      {grupos.size === 0 ? (
        <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Nenhum atendimento nesse período.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {[...grupos].map(([d, lista]) => (
            <section key={d}>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-dourado-escuro uppercase">{dataPorExtenso(d)}</h2>
              <ul className="flex flex-col gap-2">
                {lista.map((a) => (
                  <li key={a.id}>
                    <CartaoAtendimento a={a} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <BotaoFlutuante href={`/agenda/novo?data=${de}`} rotulo="Novo atendimento" />
    </>
  );
}
