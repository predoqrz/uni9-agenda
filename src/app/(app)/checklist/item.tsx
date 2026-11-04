"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Check, MessageCircle, Undo2 } from "lucide-react";
import { linkWhatsApp } from "@/lib/mensagens";
import { desfazerFeito, marcarFeito } from "./acoes";

export type ItemVisivel = {
  chave: string;
  lembreteId: string;
  confirmacao: boolean;
  clienteId: string;
  nome: string;
  telefone: string | null;
  referencia: string;
  texto: string;
  detalhe: string;
  atendimentoId: string | null;
  feitoId: string | null;
};

/** Uma pessoa a chamar: abre o WhatsApp com a mensagem já escrita e marca "Feito" (com desfazer). */
export function ItemChecklist({ item }: { item: ItemVisivel }) {
  const [feito, setFeitoOtimista] = useOptimistic(item.feitoId !== null);
  const [, iniciar] = useTransition();

  const marcar = () =>
    iniciar(async () => {
      setFeitoOtimista(true);
      await marcarFeito(item.lembreteId, item.clienteId, item.referencia, item.confirmacao ? item.atendimentoId : null);
    });
  const desfazer = () =>
    iniciar(async () => {
      setFeitoOtimista(false);
      if (item.feitoId) await desfazerFeito(item.feitoId);
    });

  return (
    <li className={`rounded-2xl border p-4 transition-opacity ${feito ? "border-linha opacity-60" : "border-linha"}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link href={`/clientes/${item.clienteId}`} className="min-w-0">
          <span className={`block truncate font-semibold ${feito ? "line-through" : ""}`}>{item.nome}</span>
          <span className="block text-sm text-secundario">{item.detalhe}</span>
        </Link>
        {feito && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-preto px-3 py-1 text-xs font-semibold text-dourado">
            <Check size={14} aria-hidden /> Feito
          </span>
        )}
      </div>
      {!feito && <p className="mb-3 line-clamp-3 rounded-2xl rounded-tl-sm bg-superficie px-3 py-2 text-sm">{item.texto}</p>}
      <div className="flex gap-2">
        {!feito && item.telefone && (
          <a
            href={linkWhatsApp(item.telefone, item.texto)}
            target="_blank"
            rel="noreferrer"
            className="apertavel flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-dourado font-semibold text-preto"
          >
            <MessageCircle size={18} aria-hidden /> WhatsApp
          </a>
        )}
        {!feito && !item.telefone && (
          <span className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-linha text-sm text-secundario">Sem telefone</span>
        )}
        {feito ? (
          <button type="button" onClick={desfazer} className="apertavel flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-medium text-secundario">
            <Undo2 size={18} aria-hidden /> Desfazer
          </button>
        ) : (
          <button type="button" onClick={marcar} className="apertavel flex h-12 items-center gap-2 rounded-2xl bg-preto px-4 font-semibold text-dourado">
            <Check size={18} aria-hidden /> {item.confirmacao ? "Confirmou" : "Feito"}
          </button>
        )}
      </div>
    </li>
  );
}
