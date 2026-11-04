"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Aviso, BotaoPrincipal, Campo, estiloCampo } from "@/components/ui";
import { TIPOS_LEMBRETE, type Lembrete, type TipoLembrete } from "@/lib/checklist";
import { preencher } from "@/lib/mensagens";
import { CATEGORIAS, LISTA_CATEGORIAS } from "@/lib/servicos";
import { useRodada } from "@/lib/usar-rodada";
import { salvarLembrete, type EstadoLembrete } from "./acoes";

const EXEMPLO = { nome: "Maria Souza", servico: "Volume brasileiro", data: "12/11", hora: "14:00", prazo: "15/11" };
const MARCADORES = ["{nome}", "{servico}", "{data}", "{hora}", "{prazo}"];

/** Texto com botões de marcador e prévia "como ela vai receber". */
function CampoMensagem({ nome, rotulo, inicial, erro, dica }: { nome: string; rotulo: string; inicial: string; erro?: string; dica?: string }) {
  const [texto, setTexto] = useState(inicial);
  return (
    <div className="flex flex-col gap-2">
      <Campo rotulo={rotulo} erro={erro} dica={dica}>
        <textarea name={nome} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} className={`${estiloCampo} h-auto py-3`} />
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
    </div>
  );
}

function Numero({ nome, rotulo, inicial, erro, dica }: { nome: string; rotulo: string; inicial: string; erro?: string; dica?: string }) {
  return (
    <Campo rotulo={rotulo} erro={erro} dica={dica}>
      <input name={nome} inputMode="numeric" defaultValue={inicial} className={`${estiloCampo} tabular-nums`} />
    </Campo>
  );
}

export function FormularioLembrete({ id, inicial }: { id: string | null; inicial: Lembrete }) {
  const [estado, acao, enviando] = useActionState<EstadoLembrete, FormData>(salvarLembrete.bind(null, id), undefined);
  const rodada = useRodada(estado);
  // Remonta a cada resposta: campos, checkboxes e o tipo voltam com o que foi enviado.
  return <Corpo key={rodada} inicial={estado?.valores ?? inicial} erros={estado?.erros ?? {}} acao={acao} enviando={enviando} />;
}

function Corpo({
  inicial,
  erros: e,
  acao,
  enviando,
}: {
  inicial: Lembrete;
  erros: Record<string, string>;
  acao: (dados: FormData) => void;
  enviando: boolean;
}) {
  const [tipo, setTipo] = useState<TipoLembrete>(inicial.tipo);
  const rotuloDias = tipo === "retorno" ? "Retorno em quantos dias" : tipo === "pos_atendimento" ? "Quantos dias depois" : "Quantos dias antes";

  return (
    <form action={acao} className="flex flex-col gap-5" noValidate>
      {e.geral && <Aviso tipo="erro">{e.geral}</Aviso>}
      <Campo rotulo="Nome" erro={e.nome}>
        <input name="nome" defaultValue={inicial.nome} className={estiloCampo} />
      </Campo>
      <Campo rotulo="Tipo" dica={TIPOS_LEMBRETE[tipo].regra}>
        <select name="tipo" value={tipo} onChange={(ev) => setTipo(ev.target.value as TipoLembrete)} className={estiloCampo}>
          {(Object.keys(TIPOS_LEMBRETE) as TipoLembrete[]).map((t) => (
            <option key={t} value={t}>{TIPOS_LEMBRETE[t].nome}</option>
          ))}
        </select>
      </Campo>

      {tipo === "retorno" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Depois de qual serviço</legend>
          <div className="grid grid-cols-2 gap-2">
            {LISTA_CATEGORIAS.map((c) => (
              <label key={c} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-linha px-3 has-[:checked]:border-dourado has-[:checked]:bg-superficie">
                <input type="checkbox" name="categorias" value={c} defaultChecked={inicial.categorias.includes(c)} className="size-5 accent-[var(--dourado)]" />
                <span className="text-sm">{CATEGORIAS[c]}</span>
              </label>
            ))}
          </div>
          {e.categorias && <span className="text-sm font-medium text-erro">{e.categorias}</span>}
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Numero nome="dias" rotulo={rotuloDias} inicial={String(inicial.dias)} erro={e.dias} dica={tipo === "aniversario" ? "0 = no dia" : undefined} />
        {tipo === "retorno" && <Numero nome="avisar_antes" rotulo="Avisar dias antes" inicial={String(inicial.avisar_antes)} erro={e.avisar_antes} />}
      </div>

      <CampoMensagem nome="mensagem" rotulo="Mensagem" inicial={inicial.mensagem} erro={e.mensagem} />

      {tipo === "retorno" && (
        <details className="rounded-2xl border border-linha px-4" open={Boolean(inicial.mensagem_atrasada || inicial.limite_manutencoes || inicial.sumir_apos)}>
          <summary className="flex h-14 cursor-pointer items-center font-medium">Opções do retorno</summary>
          <div className="flex flex-col gap-5 pb-4">
            <CampoMensagem nome="mensagem_atrasada" rotulo="Mensagem depois do prazo (opcional)" inicial={inicial.mensagem_atrasada ?? ""} erro={e.mensagem_atrasada} />
            <Numero nome="limite_manutencoes" rotulo="Limite de manutenções seguidas" inicial={inicial.limite_manutencoes?.toString() ?? ""} erro={e.limite_manutencoes} dica="Ex.: 3 → a 4ª vira nova colocação. Vazio = sem limite." />
            <CampoMensagem nome="mensagem_nova_colocacao" rotulo="Mensagem de nova colocação (opcional)" inicial={inicial.mensagem_nova_colocacao ?? ""} erro={e.mensagem_nova_colocacao} />
            <Numero nome="sumir_apos" rotulo="Sumir da lista depois de quantos dias do prazo" inicial={inicial.sumir_apos?.toString() ?? ""} erro={e.sumir_apos} dica="Vazio = nunca some sozinho." />
          </div>
        </details>
      )}

      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-linha px-4">
        <span className="font-medium">Ativo</span>
        <input type="checkbox" name="ativo" defaultChecked={inicial.ativo} className="size-6 accent-[var(--dourado)]" />
      </label>
      <BotaoPrincipal type="submit" disabled={enviando}>
        {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
        {enviando ? "Salvando…" : "Salvar"}
      </BotaoPrincipal>
    </form>
  );
}
