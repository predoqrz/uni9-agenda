import Link from "next/link";
import { Pencil } from "lucide-react";
import { BotaoFlutuante, Titulo } from "@/components/ui";
import { TIPOS_LEMBRETE } from "@/lib/checklist";
import { carregarLembretes } from "@/lib/checklist-dados";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Todas as mensagens num lugar só: as prontas (livres) e o texto completo de cada lembrete. */
export default async function Mensagens() {
  const supabase = await criarClienteServidor();
  const [{ data: prontas }, lembretes] = await Promise.all([
    supabase.from("mensagens_prontas").select("id, titulo, texto").is("deleted_at", null).order("ordem").order("titulo"),
    carregarLembretes(),
  ]);

  return (
    <>
      <Titulo>Mensagens</Titulo>
      <p className="mb-6 text-secundario">
        Marcadores: <code>{"{nome}"}</code> (primeiro nome), <code>{"{servico}"}</code>, <code>{"{data}"}</code>, <code>{"{hora}"}</code> e, nos retornos, <code>{"{prazo}"}</code>.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-dourado-escuro uppercase">Mensagens prontas</h2>
        {(prontas ?? []).length === 0 ? (
          <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Nenhuma ainda. Toque no + para criar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(prontas ?? []).map((m) => (
              <li key={m.id}>
                <Link href={`/mensagens/${m.id}`} className="apertavel block rounded-2xl border border-linha p-4 hover:bg-superficie">
                  <span className="mb-1 flex items-center justify-between font-medium">
                    {m.titulo} <Pencil size={16} className="text-secundario" aria-hidden />
                  </span>
                  <span className="text-sm whitespace-pre-wrap text-secundario">{m.texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-dourado-escuro uppercase">Textos dos lembretes</h2>
        <ul className="flex flex-col gap-2">
          {lembretes.map((l) => (
            <li key={l.id}>
              <Link href={`/lembretes/${l.id}`} className="apertavel block rounded-2xl border border-linha p-4 hover:bg-superficie">
                <span className="mb-1 flex items-center justify-between font-medium">
                  {l.nome} <Pencil size={16} className="text-secundario" aria-hidden />
                </span>
                <span className="mb-2 block text-xs text-secundario">{TIPOS_LEMBRETE[l.tipo].nome}{l.ativo ? "" : " · pausado"}</span>
                <span className="block text-sm whitespace-pre-wrap">{l.mensagem}</span>
                {l.mensagem_atrasada && (
                  <span className="mt-2 block text-sm whitespace-pre-wrap text-secundario"><strong>Depois do prazo:</strong> {l.mensagem_atrasada}</span>
                )}
                {l.mensagem_nova_colocacao && (
                  <span className="mt-2 block text-sm whitespace-pre-wrap text-secundario"><strong>Nova colocação:</strong> {l.mensagem_nova_colocacao}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <BotaoFlutuante href="/mensagens/nova" rotulo="Nova mensagem pronta" />
    </>
  );
}
