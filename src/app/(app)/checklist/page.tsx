import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Titulo } from "@/components/ui";
import { checklistDeHoje } from "@/lib/checklist-dados";
import { dataPorExtenso, hoje } from "@/lib/tempo";
import { ItemChecklist, type ItemVisivel } from "./item";

export default async function Checklist() {
  const { lembretes, itens } = await checklistDeHoje();
  const pendentes = itens.filter((i) => !i.feitoId).length;

  const grupos = lembretes
    .filter((l) => l.ativo)
    .map((l) => ({ lembrete: l, itens: itens.filter((i) => i.lembrete.id === l.id) }))
    .filter((g) => g.itens.length > 0)
    // Pendentes primeiro dentro de cada grupo.
    .map((g) => ({ ...g, itens: [...g.itens].sort((a, b) => Number(a.feitoId !== null) - Number(b.feitoId !== null)) }));

  return (
    <>
      <Titulo
        acao={
          <Link href="/lembretes" className="apertavel flex h-12 items-center gap-2 rounded-xl px-3 text-sm font-medium text-dourado-escuro">
            <Settings2 size={18} aria-hidden /> Lembretes
          </Link>
        }
      >
        Checklist
      </Titulo>
      <p className="mb-5 text-secundario">
        <span className="capitalize">{dataPorExtenso(hoje())}</span> ·{" "}
        {pendentes === 0 ? "tudo feito por hoje" : `${pendentes} pessoa(s) para chamar`}
      </p>

      {grupos.length === 0 ? (
        <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Ninguém para chamar hoje.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {grupos.map((g) => (
            <section key={g.lembrete.id}>
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold tracking-wide text-dourado-escuro uppercase">
                {g.lembrete.nome}
                <span className="rounded-full bg-superficie px-2 py-0.5 tabular-nums">{g.itens.filter((i) => !i.feitoId).length}</span>
              </h2>
              <ul className="flex flex-col gap-3">
                {g.itens.map((i) => {
                  const visivel: ItemVisivel = {
                    chave: i.chave,
                    lembreteId: i.lembrete.id,
                    confirmacao: i.lembrete.tipo === "confirmacao",
                    clienteId: i.cliente.id,
                    nome: i.cliente.nome,
                    telefone: i.cliente.telefone,
                    referencia: i.referencia,
                    texto: i.texto,
                    detalhe: i.detalhe,
                    atendimentoId: i.atendimentoId,
                    feitoId: i.feitoId,
                  };
                  return <ItemChecklist key={`${i.chave}|${i.feitoId ?? ""}`} item={visivel} />;
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
