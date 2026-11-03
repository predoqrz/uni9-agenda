import { notFound } from "next/navigation";
import { BotaoSecundario, Titulo } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { formatarTelefone } from "@/lib/telefone";
import { arquivarCliente, restaurarCliente } from "../acoes";
import { FormularioCliente } from "../formulario-cliente";

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await criarClienteServidor();
  const { data: c } = await supabase
    .from("clientes")
    .select("id, nome, telefone, nascimento, rede_social, observacoes, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  const arquivada = c.deleted_at !== null;
  return (
    <>
      <Titulo>{arquivada ? "Cliente arquivada" : "Editar cliente"}</Titulo>
      <FormularioCliente
        inicial={{
          id: c.id,
          nome: c.nome,
          telefone: formatarTelefone(c.telefone),
          nascimento: c.nascimento ?? "",
          rede_social: c.rede_social ?? "",
          observacoes: c.observacoes ?? "",
        }}
      />
      <form action={(arquivada ? restaurarCliente : arquivarCliente).bind(null, c.id)} className="mt-8">
        <BotaoSecundario type="submit" className="w-full">
          {arquivada ? "Restaurar cliente" : "Arquivar cliente"}
        </BotaoSecundario>
        {!arquivada && (
          <p className="mt-2 text-center text-sm text-secundario">Arquivar esconde da lista. Nada é apagado.</p>
        )}
      </form>
    </>
  );
}
