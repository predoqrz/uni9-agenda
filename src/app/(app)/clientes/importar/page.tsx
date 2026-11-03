import { Titulo } from "@/components/ui";
import { buscarTodos } from "@/lib/supabase/buscar-todos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { Importador } from "./importador";

export default async function ImportarContatos() {
  const supabase = await criarClienteServidor();
  const linhas = await buscarTodos<{ telefone: string | null }>((de, ate) =>
    supabase.from("clientes").select("telefone").is("deleted_at", null).order("id").range(de, ate),
  );
  const telefones = linhas.map((l) => l.telefone).filter((t): t is string => Boolean(t));

  return (
    <>
      <Titulo>Importar do iPhone</Titulo>
      <Importador telefonesExistentes={telefones} />
    </>
  );
}
