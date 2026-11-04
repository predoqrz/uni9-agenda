"use client";

import { useState } from "react";
import { MessageSquareText, X } from "lucide-react";
import { linkWhatsApp, preencher, type Marcadores } from "@/lib/mensagens";

export type MensagemPronta = { id: string; titulo: string; texto: string };

/** Escolhe uma mensagem pronta, mostra como ela vai receber e abre o WhatsApp com o texto. */
export function EnviarMensagem({ telefone, marcadores, mensagens }: { telefone: string; marcadores: Marcadores; mensagens: MensagemPronta[] }) {
  const [aberto, setAberto] = useState(false);
  const [escolhida, setEscolhida] = useState<MensagemPronta | null>(null);
  const texto = escolhida ? preencher(escolhida.texto, marcadores) : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="apertavel flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-linha font-semibold hover:bg-superficie"
      >
        <MessageSquareText size={20} aria-hidden /> Enviar mensagem pronta
      </button>

      {aberto && (
        <div role="dialog" aria-modal="true" aria-label="Mensagens prontas" className="fixed inset-0 z-50 flex items-end bg-preto/40" onClick={() => setAberto(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="entrada-painel max-h-[85dvh] w-full overflow-auto rounded-t-[28px] bg-branco px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{escolhida ? "Como ela vai receber" : "Mensagens prontas"}</h2>
              <button type="button" onClick={() => (escolhida ? setEscolhida(null) : setAberto(false))} aria-label={escolhida ? "Voltar" : "Fechar"} className="apertavel grid size-12 place-items-center rounded-xl">
                <X size={22} />
              </button>
            </div>
            {escolhida ? (
              <>
                <p className="mb-4 rounded-2xl rounded-tl-sm bg-superficie px-4 py-3 whitespace-pre-wrap">{texto}</p>
                <a
                  href={linkWhatsApp(telefone, texto)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setAberto(false)}
                  className="apertavel flex h-14 items-center justify-center rounded-2xl bg-dourado font-semibold text-preto"
                >
                  Abrir no WhatsApp
                </a>
                <p className="mt-2 text-center text-sm text-secundario">O app não envia sozinho: você confere e envia.</p>
              </>
            ) : mensagens.length === 0 ? (
              <p className="py-6 text-center text-secundario">Nenhuma mensagem pronta cadastrada.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {mensagens.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setEscolhida(m)} className="apertavel flex w-full flex-col rounded-2xl border border-linha px-4 py-3 text-left hover:bg-superficie">
                      <span className="font-medium">{m.titulo}</span>
                      <span className="line-clamp-2 text-sm text-secundario">{preencher(m.texto, marcadores)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
