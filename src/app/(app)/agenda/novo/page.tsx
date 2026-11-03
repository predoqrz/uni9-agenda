import { Titulo } from "@/components/ui";
import { eData, hoje } from "@/lib/tempo";
import { FormularioAtendimento } from "../formulario-atendimento";
import { carregarOpcoes } from "../opcoes";

export default async function NovoAtendimento({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; hora?: string; cliente?: string }>;
}) {
  const sp = await searchParams;
  const { clientes, servicos } = await carregarOpcoes();
  const cliente = clientes.some((c) => c.id === sp.cliente) ? sp.cliente! : "";

  return (
    <>
      <Titulo>Novo atendimento</Titulo>
      <FormularioAtendimento
        clientes={clientes}
        servicos={servicos}
        inicial={{
          id: null,
          cliente_id: cliente,
          data: eData(sp.data) ? sp.data : hoje(),
          hora: sp.hora && /^\d{2}:\d{2}$/.test(sp.hora) ? sp.hora : "09:00",
          duracao_min: "60",
          duracaoManual: false,
          itens: [],
          desconto: "",
          sinal: "",
          sinalManual: false,
          observacoes: "",
        }}
      />
    </>
  );
}
