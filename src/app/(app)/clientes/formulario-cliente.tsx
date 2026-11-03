"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Aviso, BotaoPrincipal, Campo, estiloCampo } from "@/components/ui";
import { useRodada } from "@/lib/usar-rodada";
import { salvarCliente, type EstadoCliente } from "./acoes";

export type ClienteFormulario = {
  id: string | null;
  nome: string;
  telefone: string;
  nascimento: string;
  rede_social: string;
  observacoes: string;
};

export function FormularioCliente({ inicial }: { inicial: ClienteFormulario }) {
  const [estado, acao, enviando] = useActionState<EstadoCliente, FormData>(
    salvarCliente.bind(null, inicial.id),
    undefined,
  );
  const rodada = useRodada(estado);
  // Ao voltar com erro, mostra só o que a pessoa acabou de mandar.
  const v = estado?.valores ?? inicial;
  const e = estado?.erros ?? {};

  return (
    <form key={rodada} action={acao} className="flex flex-col gap-5" noValidate>
      {e.geral && <Aviso tipo="erro">{e.geral}</Aviso>}
      <Campo rotulo="Nome" erro={e.nome}>
        <input name="nome" defaultValue={v.nome} autoComplete="off" required className={estiloCampo} />
      </Campo>
      <Campo rotulo="WhatsApp" erro={e.telefone} dica="Com DDD. Ex.: (11) 98765-4321">
        <input name="telefone" type="tel" inputMode="tel" defaultValue={v.telefone} className={estiloCampo} />
      </Campo>
      <Campo rotulo="Nascimento" erro={e.nascimento}>
        <input name="nascimento" type="date" defaultValue={v.nascimento} className={estiloCampo} />
      </Campo>
      <Campo rotulo="Instagram / rede social" erro={e.rede_social}>
        <input name="rede_social" defaultValue={v.rede_social} placeholder="@usuario" className={estiloCampo} />
      </Campo>
      <Campo
        rotulo="Observações"
        erro={e.observacoes}
        dica="Preferências da cliente. Não registre informação de saúde aqui."
      >
        <textarea
          name="observacoes"
          defaultValue={v.observacoes}
          rows={3}
          className={`${estiloCampo} h-auto py-3`}
        />
      </Campo>
      <BotaoPrincipal type="submit" disabled={enviando}>
        {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
        {enviando ? "Salvando…" : "Salvar"}
      </BotaoPrincipal>
    </form>
  );
}
