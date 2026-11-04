import { notFound } from "next/navigation";
import { BotaoSecundario, Titulo } from "@/components/ui";
import { carregarLembretes } from "@/lib/checklist-dados";
import { arquivarLembrete } from "../acoes";
import { FormularioLembrete } from "../formulario-lembrete";

export default async function EditarLembrete({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = (await carregarLembretes()).find((x) => x.id === id);
  if (!l) notFound();

  return (
    <>
      <Titulo>Editar lembrete</Titulo>
      <FormularioLembrete id={l.id} inicial={l} />
      <form action={arquivarLembrete.bind(null, l.id)} className="mt-8">
        <BotaoSecundario className="w-full">Arquivar lembrete</BotaoSecundario>
        <p className="mt-2 text-center text-sm text-secundario">Para só pausar, desmarque “Ativo”.</p>
      </form>
    </>
  );
}
