import { notFound } from "next/navigation";
import { BotaoSecundario, Titulo } from "@/components/ui";
import type { Recorrencia } from "@/lib/caixa";
import { formatarDinheiro } from "@/lib/nucleo";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { arquivarRecorrencia } from "../../acoes";
import { FormularioRecorrencia } from "../../formularios";

export default async function EditarContaFixa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await criarClienteServidor();
  const { data: c } = await supabase
    .from("recorrencias")
    .select("id, tipo, esfera, valor_centavos, descricao, categoria, dia_mes, comeca_em, ativo")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
    .overrideTypes<Recorrencia, { merge: false }>();
  if (!c) notFound();

  return (
    <>
      <Titulo>Editar conta fixa</Titulo>
      <p className="mb-4 text-sm text-secundario">Mudar o valor vale para os próximos meses; os já lançados ficam como estão.</p>
      <FormularioRecorrencia
        id={c.id}
        inicial={{
          tipo: c.tipo,
          esfera: c.esfera,
          valor: formatarDinheiro(c.valor_centavos).replace("R$ ", ""),
          descricao: c.descricao,
          categoria: c.categoria,
          dia_mes: String(c.dia_mes),
          comeca_em: c.comeca_em,
          ativo: c.ativo ? "on" : "",
        }}
      />
      <form action={arquivarRecorrencia.bind(null, c.id)} className="mt-8">
        <BotaoSecundario className="w-full">Arquivar conta fixa</BotaoSecundario>
      </form>
    </>
  );
}
