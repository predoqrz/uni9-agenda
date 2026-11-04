import { notFound } from "next/navigation";
import { BotaoSecundario, Titulo } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { arquivarMensagem } from "../acoes";
import { FormularioMensagem } from "../formulario-mensagem";

export default async function EditarMensagem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await criarClienteServidor();
  const { data: m } = await supabase.from("mensagens_prontas").select("id, titulo, texto").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!m) notFound();

  return (
    <>
      <Titulo>Editar mensagem</Titulo>
      <FormularioMensagem id={m.id} inicial={{ titulo: m.titulo, texto: m.texto }} />
      <form action={arquivarMensagem.bind(null, m.id)} className="mt-8">
        <BotaoSecundario className="w-full">Arquivar mensagem</BotaoSecundario>
      </form>
    </>
  );
}
