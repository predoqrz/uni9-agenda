import { notFound } from "next/navigation";
import { Titulo } from "@/components/ui";
import { formatarDinheiro } from "@/lib/nucleo";
import { emMinutos, partes } from "@/lib/tempo";
import { FormularioAtendimento } from "../../formulario-atendimento";
import { carregarOpcoes } from "../../opcoes";
import { carregarAtendimento } from "../dados";

const paraCampo = (centavos: number) => (centavos ? formatarDinheiro(centavos).replace("R$ ", "") : "");

export default async function EditarAtendimento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, opcoes] = await Promise.all([carregarAtendimento(id), carregarOpcoes()]);
  if (!a) notFound();

  // Cliente ou serviço arquivado depois do agendamento continua aparecendo aqui.
  const clientes = a.cliente && !opcoes.clientes.some((c) => c.id === a.cliente!.id) ? [a.cliente, ...opcoes.clientes] : opcoes.clientes;
  const servicos = [...opcoes.servicos];
  for (const i of a.itens) {
    if (!servicos.some((s) => s.id === i.servico_id)) {
      servicos.push({ id: i.servico_id, nome: i.servico?.nome ?? "Serviço", preco_centavos: i.valor_centavos, duracao_min: 0, sinal_centavos: 0 });
    }
  }

  const ini = partes(a.inicio);
  return (
    <>
      <Titulo>Editar atendimento</Titulo>
      <FormularioAtendimento
        clientes={clientes}
        servicos={servicos}
        inicial={{
          id: a.id,
          cliente_id: a.cliente?.id ?? "",
          data: ini.data,
          hora: ini.hora,
          duracao_min: String(emMinutos(a.fim) - emMinutos(a.inicio)),
          duracaoManual: true,
          itens: a.itens.map((i) => ({ chave: i.id, servico_id: i.servico_id, valor: paraCampo(i.valor_centavos) })),
          desconto: paraCampo(a.desconto_centavos),
          sinal: paraCampo(a.sinal_centavos),
          sinalManual: true,
          observacoes: a.observacoes ?? "",
        }}
      />
    </>
  );
}
