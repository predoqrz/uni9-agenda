import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Cake, MessageCircle, Pencil } from "lucide-react";
import { Aviso } from "@/components/ui";
import { CartaoAtendimento } from "@/app/(app)/agenda/componentes";
import type { AtendimentoResumo } from "@/lib/agenda";
import { linkWhatsApp } from "@/lib/mensagens";
import { formatarDinheiro } from "@/lib/nucleo";
import { buscarTodos } from "@/lib/supabase/buscar-todos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { formatarTelefone } from "@/lib/telefone";
import { dataCurta, dataPorExtenso, diasNoMes, hoje, partes } from "@/lib/tempo";
import { EnviarMensagem, type MensagemPronta } from "./enviar-mensagem";

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  nascimento: string | null;
  rede_social: string | null;
  observacoes: string | null;
  criado_em: string;
  deleted_at: string | null;
};

/** Idade e quantos dias faltam para o próximo aniversário (29/02 vira 28/02 em ano comum). */
function aniversario(nascimento: string, hojeSP: string) {
  const [an, mn, dn] = nascimento.split("-").map(Number);
  const [ah, mh, dh] = hojeSP.split("-").map(Number);
  let idade = ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
  if (idade < 0) idade = 0;
  const noAno = (ano: number) => `${ano}-${String(mn).padStart(2, "0")}-${String(Math.min(dn, diasNoMes(`${ano}-${String(mn).padStart(2, "0")}`))).padStart(2, "0")}`;
  let proximo = noAno(ah);
  if (proximo < hojeSP) proximo = noAno(ah + 1);
  const dias = Math.round((Date.parse(proximo) - Date.parse(hojeSP)) / 86_400_000);
  return { idade, proximo, dias };
}

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await criarClienteServidor();

  const [{ data: c }, historico, { data: mensagens }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, telefone, nascimento, rede_social, observacoes, criado_em, deleted_at")
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<Cliente, { merge: false }>(),
    buscarTodos<AtendimentoResumo>((a, b) =>
      supabase
        .from("atendimentos")
        .select("id, inicio, fim, status, servicos_resumo, valor_cobrado_centavos, sinal_centavos, sinal_pago_em, cliente:clientes(id, nome, telefone)")
        .eq("cliente_id", id)
        .is("deleted_at", null)
        .order("inicio", { ascending: false })
        .order("id")
        .range(a, b)
        .overrideTypes<AtendimentoResumo[], { merge: false }>(),
    ),
    supabase.from("mensagens_prontas").select("id, titulo, texto").is("deleted_at", null).order("ordem").order("titulo"),
  ]);
  if (!c) notFound();

  const hojeSP = hoje();
  const agora = new Date().toISOString();
  const realizados = historico.filter((a) => a.status === "realizado");
  const faltas = historico.filter((a) => a.status === "faltou").length;
  const cancelados = historico.filter((a) => a.status === "cancelado").length;
  const totalGasto = realizados.reduce((s, a) => s + a.valor_cobrado_centavos, 0);
  const proximo = [...historico].reverse().find((a) => (a.status === "agendado" || a.status === "confirmado") && a.fim >= agora);
  const ultima = realizados[0];
  const niver = c.nascimento ? aniversario(c.nascimento, hojeSP) : null;

  const marcadores = {
    nome: c.nome,
    servico: proximo?.servicos_resumo ?? ultima?.servicos_resumo ?? "",
    data: proximo ? dataCurta(partes(proximo.inicio).data) : "",
    hora: proximo ? partes(proximo.inicio).hora : "",
  };

  return (
    <>
      {c.deleted_at && (
        <div className="mb-4">
          <Aviso tipo="erro">Cliente arquivada. Para restaurar, toque em Editar.</Aviso>
        </div>
      )}

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-marca text-2xl font-semibold break-words">{c.nome}</h1>
          {c.telefone && <p className="text-secundario tabular-nums">{formatarTelefone(c.telefone)}</p>}
          {c.rede_social && <p className="text-sm text-secundario">{c.rede_social}</p>}
        </div>
        <Link href={`/clientes/${c.id}/editar`} className="apertavel flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-linha px-4 font-medium hover:bg-superficie">
          <Pencil size={18} aria-hidden /> Editar
        </Link>
      </div>

      {niver && (
        <p className="mb-4 flex items-center gap-2 text-sm">
          <Cake size={18} className="text-dourado-escuro" aria-hidden />
          {niver.idade} anos ·{" "}
          {niver.dias === 0 ? <strong className="text-dourado-escuro">aniversário hoje!</strong> : `aniversário em ${dataCurta(niver.proximo)} (faltam ${niver.dias} dias)`}
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2">
        <Link href={`/agenda/novo?cliente=${c.id}`} className="apertavel flex h-14 items-center justify-center gap-2 rounded-2xl bg-dourado font-semibold text-preto">
          <CalendarPlus size={20} aria-hidden /> Marcar
        </Link>
        {c.telefone ? (
          <a href={linkWhatsApp(c.telefone)} target="_blank" rel="noreferrer" className="apertavel flex h-14 items-center justify-center gap-2 rounded-2xl bg-preto font-semibold text-dourado">
            <MessageCircle size={20} aria-hidden /> WhatsApp
          </a>
        ) : (
          <span className="flex h-14 items-center justify-center rounded-2xl border border-linha text-sm text-secundario">Sem telefone</span>
        )}
      </div>
      {c.telefone && (
        <div className="mb-6">
          <EnviarMensagem telefone={c.telefone} marcadores={marcadores} mensagens={(mensagens ?? []) as MensagemPronta[]} />
        </div>
      )}

      <dl className="mb-6 grid grid-cols-3 gap-2 text-center">
        {[
          ["Visitas", String(realizados.length)],
          ["Total gasto", formatarDinheiro(totalGasto)],
          ["Faltas", String(faltas)],
        ].map(([r, v]) => (
          <div key={r} className="rounded-2xl bg-superficie px-2 py-3">
            <dt className="text-xs text-secundario">{r}</dt>
            <dd className="font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Próximo horário</h2>
        {proximo ? (
          <>
            <p className="mb-2 text-sm capitalize text-secundario">{dataPorExtenso(partes(proximo.inicio).data)}</p>
            <CartaoAtendimento a={proximo} />
          </>
        ) : (
          <p className="text-secundario">Nenhum horário marcado.{ultima ? ` Última visita em ${dataCurta(partes(ultima.inicio).data)}.` : ""}</p>
        )}
      </section>

      {c.observacoes && (
        <section className="mb-6 rounded-2xl border border-linha p-4">
          <h2 className="mb-1 text-sm font-semibold">Preferências</h2>
          <p className="whitespace-pre-wrap">{c.observacoes}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">
          Histórico ({historico.length}){cancelados ? <span className="font-normal text-secundario"> · {cancelados} cancelado(s)</span> : null}
        </h2>
        {historico.length === 0 ? (
          <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Ainda sem atendimentos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {historico.map((a) => (
              <li key={a.id}>
                <p className="mb-1 text-xs font-semibold tracking-wide text-dourado-escuro uppercase">{dataCurta(partes(a.inicio).data)}/{partes(a.inicio).data.slice(0, 4)}</p>
                <CartaoAtendimento a={a} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
