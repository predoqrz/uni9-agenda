"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Aviso, BotaoPrincipal, Campo, estiloCampo } from "@/components/ui";
import { preencher } from "@/lib/mensagens";
import { useRodada } from "@/lib/usar-rodada";
import { salvarMensagem, type EstadoMensagem, type ValoresMensagem } from "./acoes";

const EXEMPLO = { nome: "Maria Souza", servico: "Volume brasileiro", data: "12/11", hora: "14:00", prazo: "15/11" };
const MARCADORES = ["{nome}", "{servico}", "{data}", "{hora}"];

export function FormularioMensagem({ id, inicial }: { id: string | null; inicial: ValoresMensagem }) {
  const [estado, acao, enviando] = useActionState<EstadoMensagem, FormData>(salvarMensagem.bind(null, id), undefined);
  const rodada = useRodada(estado);
  return <Corpo key={rodada} inicial={estado?.valores ?? inicial} erros={estado?.erros ?? {}} acao={acao} enviando={enviando} />;
}

function Corpo({ inicial, erros: e, acao, enviando }: { inicial: ValoresMensagem; erros: Record<string, string>; acao: (d: FormData) => void; enviando: boolean }) {
  const [texto, setTexto] = useState(inicial.texto);
  return (
    <form action={acao} className="flex flex-col gap-5" noValidate>
      {e.geral && <Aviso tipo="erro">{e.geral}</Aviso>}
      <Campo rotulo="Título" erro={e.titulo}>
        <input name="titulo" defaultValue={inicial.titulo} className={estiloCampo} />
      </Campo>
      <Campo rotulo="Texto" erro={e.texto}>
        <textarea name="texto" rows={5} value={texto} onChange={(ev) => setTexto(ev.target.value)} className={`${estiloCampo} h-auto py-3`} />
      </Campo>
      <div className="flex flex-wrap gap-1">
        {MARCADORES.map((m) => (
          <button key={m} type="button" onClick={() => setTexto((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${m}`)} className="apertavel h-10 rounded-full border border-linha px-3 text-sm font-medium hover:bg-superficie">
            {m}
          </button>
        ))}
      </div>
      {texto.trim() && (
        <div>
          <p className="mb-1 text-xs font-semibold text-secundario uppercase">Como ela vai receber</p>
          <p className="rounded-2xl rounded-tl-sm bg-superficie px-4 py-3 text-sm whitespace-pre-wrap">{preencher(texto, EXEMPLO)}</p>
        </div>
      )}
      <BotaoPrincipal type="submit" disabled={enviando}>
        {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
        {enviando ? "Salvando…" : "Salvar"}
      </BotaoPrincipal>
    </form>
  );
}
