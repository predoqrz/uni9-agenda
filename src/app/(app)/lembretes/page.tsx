import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BotaoFlutuante, Titulo } from "@/components/ui";
import { TIPOS_LEMBRETE } from "@/lib/checklist";
import { carregarLembretes } from "@/lib/checklist-dados";

export default async function Lembretes() {
  const lembretes = await carregarLembretes();
  const regra = (l: (typeof lembretes)[number]) =>
    l.tipo === "retorno"
      ? `${l.dias} dias depois · avisa ${l.avisar_antes} antes`
      : l.tipo === "pos_atendimento"
        ? `${l.dias} dia(s) depois`
        : l.dias === 0
          ? "no dia"
          : `${l.dias} dia(s) antes`;

  return (
    <>
      <Titulo>Lembretes</Titulo>
      <p className="mb-4 text-secundario">As regras que montam o Checklist do dia. Tudo editável: nome, mensagem e regra.</p>
      {lembretes.length === 0 ? (
        <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Nenhum lembrete. Toque no + para criar.</p>
      ) : (
        <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
          {lembretes.map((l) => (
            <li key={l.id}>
              <Link href={`/lembretes/${l.id}`} className="apertavel flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-superficie">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate font-medium ${l.ativo ? "" : "text-secundario line-through"}`}>{l.nome}</span>
                  <span className="text-sm text-secundario">
                    {TIPOS_LEMBRETE[l.tipo].nome} · {regra(l)}
                    {l.ativo ? "" : " · pausado"}
                  </span>
                </span>
                <ChevronRight size={18} className="text-secundario" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/mensagens" className="mt-6 block py-3 text-center text-sm font-medium text-secundario underline underline-offset-4">
        Ver todas as mensagens
      </Link>
      <BotaoFlutuante href="/lembretes/novo" rotulo="Novo lembrete" />
    </>
  );
}
