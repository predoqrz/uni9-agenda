// Regras do Checklist do dia: quem a profissional deve chamar hoje, e com qual texto.
// Função pura (sem banco), para dar para testar com datas fixas.
import { preencher } from "@/lib/mensagens";
import { dataCurta, diasNoMes, partes, somarDias } from "@/lib/tempo";

export type TipoLembrete = "retorno" | "pos_atendimento" | "confirmacao" | "aniversario";

export const TIPOS_LEMBRETE: Record<TipoLembrete, { nome: string; regra: string }> = {
  retorno: { nome: "Retorno", regra: "N dias depois do último atendimento realizado das categorias escolhidas" },
  pos_atendimento: { nome: "Pós-atendimento", regra: "N dias depois de cada atendimento realizado" },
  confirmacao: { nome: "Confirmação", regra: "N dias antes do horário marcado" },
  aniversario: { nome: "Aniversário", regra: "N dias antes do aniversário (0 = no dia)" },
};

export type Lembrete = {
  id: string;
  nome: string;
  tipo: TipoLembrete;
  mensagem: string;
  ativo: boolean;
  ordem: number;
  dias: number;
  categorias: string[];
  avisar_antes: number;
  mensagem_atrasada: string | null;
  limite_manutencoes: number | null;
  mensagem_nova_colocacao: string | null;
  sumir_apos: number | null;
};

export type ClienteChecklist = { id: string; nome: string; telefone: string | null; nascimento: string | null };
export type AtendimentoChecklist = {
  id: string;
  cliente_id: string;
  inicio: string;
  fim: string;
  status: string;
  servicos_resumo: string;
  itens: { categoria: string; e_manutencao: boolean }[];
};
export type ContatoFeito = { id: string; lembrete_id: string; cliente_id: string; referencia: string };

export type ItemChecklist = {
  chave: string;
  lembrete: Lembrete;
  cliente: ClienteChecklist;
  referencia: string;
  texto: string;
  detalhe: string;
  atendimentoId: string | null;
  feitoId: string | null;
};

/** Pós-atendimento fica na lista por mais 2 dias se não for feito no dia certo. */
const FOLGA_POS = 2;

export function proximoAniversario(nascimento: string, hoje: string): string {
  const [, mn, dn] = nascimento.split("-").map(Number);
  const noAno = (ano: number) => {
    const mes = `${ano}-${String(mn).padStart(2, "0")}`;
    return `${mes}-${String(Math.min(dn, diasNoMes(mes))).padStart(2, "0")}`;
  };
  const ano = Number(hoje.slice(0, 4));
  const esteAno = noAno(ano);
  return esteAno >= hoje ? esteAno : noAno(ano + 1);
}

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000);

export function montarChecklist(
  lembretes: Lembrete[],
  clientes: ClienteChecklist[],
  atendimentos: AtendimentoChecklist[],
  contatos: ContatoFeito[],
  hoje: string,
  agoraIso: string,
): ItemChecklist[] {
  const feitos = new Map(contatos.map((c) => [`${c.lembrete_id}|${c.cliente_id}|${c.referencia}`, c.id]));
  const porCliente = new Map<string, AtendimentoChecklist[]>();
  for (const a of [...atendimentos].sort((x, y) => y.inicio.localeCompare(x.inicio))) {
    porCliente.set(a.cliente_id, [...(porCliente.get(a.cliente_id) ?? []), a]);
  }
  const temHorarioMarcado = (clienteId: string) =>
    (porCliente.get(clienteId) ?? []).some((a) => (a.status === "agendado" || a.status === "confirmado") && a.fim >= agoraIso);

  const itens: ItemChecklist[] = [];
  const adicionar = (l: Lembrete, c: ClienteChecklist, referencia: string, mensagem: string, m: Parameters<typeof preencher>[1], detalhe: string, atendimentoId: string | null = null) => {
    const chave = `${l.id}|${c.id}|${referencia}`;
    itens.push({ chave, lembrete: l, cliente: c, referencia, texto: preencher(mensagem, { nome: c.nome, ...m }), detalhe, atendimentoId, feitoId: feitos.get(chave) ?? null });
  };

  for (const l of [...lembretes].sort((a, b) => a.ordem - b.ordem)) {
    if (!l.ativo) continue;

    for (const c of clientes) {
      const historico = porCliente.get(c.id) ?? [];

      if (l.tipo === "retorno") {
        const relevantes = historico.filter((a) => a.status === "realizado" && a.itens.some((i) => l.categorias.includes(i.categoria)));
        const ultimo = relevantes[0];
        if (!ultimo || temHorarioMarcado(c.id)) continue;
        const prazo = somarDias(partes(ultimo.inicio).data, l.dias);
        if (hoje < somarDias(prazo, -l.avisar_antes)) continue;
        if (l.sumir_apos !== null && hoje > somarDias(prazo, l.sumir_apos)) continue;

        let seguidas = 0;
        for (const a of relevantes) {
          if (a.itens.some((i) => l.categorias.includes(i.categoria) && i.e_manutencao)) seguidas++;
          else break;
        }
        const atrasada = hoje > prazo;
        const novaColocacao = l.limite_manutencoes !== null && seguidas >= l.limite_manutencoes;
        const mensagem = novaColocacao ? (l.mensagem_nova_colocacao ?? l.mensagem) : atrasada && l.mensagem_atrasada ? l.mensagem_atrasada : l.mensagem;
        const detalhe = [
          `última em ${dataCurta(partes(ultimo.inicio).data)}`,
          atrasada ? `prazo passou (${dataCurta(prazo)})` : `prazo ${dataCurta(prazo)}`,
          novaColocacao ? `${seguidas} manutenções seguidas: nova colocação` : "",
        ].filter(Boolean).join(" · ");
        adicionar(l, c, ultimo.id, mensagem, { servico: novaColocacao ? "nova colocação" : ultimo.servicos_resumo, prazo: dataCurta(prazo) }, detalhe, ultimo.id);
      }

      if (l.tipo === "pos_atendimento") {
        for (const a of historico) {
          if (a.status !== "realizado") continue;
          const passaram = diasEntre(partes(a.inicio).data, hoje);
          if (passaram < l.dias || passaram > l.dias + FOLGA_POS) continue;
          const p = partes(a.inicio);
          adicionar(l, c, a.id, l.mensagem, { servico: a.servicos_resumo, data: dataCurta(p.data), hora: p.hora }, `atendida em ${dataCurta(p.data)} · ${a.servicos_resumo}`, a.id);
        }
      }

      if (l.tipo === "confirmacao") {
        for (const a of historico) {
          if (a.status !== "agendado" || a.inicio < agoraIso) continue;
          const p = partes(a.inicio);
          if (p.data > somarDias(hoje, l.dias)) continue;
          adicionar(l, c, a.id, l.mensagem, { servico: a.servicos_resumo, data: dataCurta(p.data), hora: p.hora }, `${dataCurta(p.data)} às ${p.hora} · ${a.servicos_resumo}`, a.id);
        }
      }

      if (l.tipo === "aniversario" && c.nascimento) {
        const niver = proximoAniversario(c.nascimento, hoje);
        const faltam = diasEntre(hoje, niver);
        if (faltam > l.dias) continue;
        adicionar(l, c, niver.slice(0, 4), l.mensagem, { data: dataCurta(niver) }, faltam === 0 ? "aniversário hoje" : `aniversário em ${dataCurta(niver)}`);
      }
    }
  }
  return itens;
}
