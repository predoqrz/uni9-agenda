import { notFound } from "next/navigation";
import { BotaoSecundario, Titulo } from "@/components/ui";
import { formatarDinheiro } from "@/lib/nucleo";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { arquivarServico, restaurarServico } from "../acoes";
import { FormularioServico } from "../formulario-servico";

// Mostra o valor salvo no formato que a pessoa digitaria ("1.234,56"), sem "R$ ".
const paraCampo = (centavos: number) => (centavos ? formatarDinheiro(centavos).replace("R$ ", "") : "");

export default async function EditarServico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await criarClienteServidor();
  const { data: s } = await supabase
    .from("servicos")
    .select("id, nome, categoria, preco_centavos, duracao_min, sinal_centavos, custo_centavos, e_manutencao, ativo, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();

  const arquivado = s.deleted_at !== null;
  return (
    <>
      <Titulo>{arquivado ? "Serviço arquivado" : "Editar serviço"}</Titulo>
      <FormularioServico
        inicial={{
          id: s.id,
          nome: s.nome,
          categoria: s.categoria,
          preco: paraCampo(s.preco_centavos),
          duracao_min: String(s.duracao_min),
          sinal: paraCampo(s.sinal_centavos),
          custo: paraCampo(s.custo_centavos),
          e_manutencao: s.e_manutencao,
          ativo: s.ativo,
        }}
      />
      <form action={(arquivado ? restaurarServico : arquivarServico).bind(null, s.id)} className="mt-8">
        <BotaoSecundario type="submit" className="w-full">
          {arquivado ? "Restaurar serviço" : "Arquivar serviço"}
        </BotaoSecundario>
      </form>
    </>
  );
}
