import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Aviso, BotaoFlutuante, Titulo } from "@/components/ui";
import { buscarTodos } from "@/lib/supabase/buscar-todos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { ListaClientes, type ClienteResumo } from "./lista-clientes";

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ arquivadas?: string; erro?: string }>;
}) {
  const { arquivadas: arq, erro } = await searchParams;
  const arquivadas = arq === "1";

  let clientes: ClienteResumo[] = [];
  let falhou = false;
  try {
    const supabase = await criarClienteServidor();
    clientes = await buscarTodos<ClienteResumo>((de, ate) => {
      const q = supabase.from("clientes").select("id, nome, telefone");
      return (arquivadas ? q.not("deleted_at", "is", null) : q.is("deleted_at", null))
        .order("nome")
        .order("id")
        .range(de, ate);
    });
  } catch (e) {
    unstable_rethrow(e);
    falhou = true;
  }

  return (
    <>
      <Titulo
        acao={
          !arquivadas && (
            <Link href="/clientes/importar" className="apertavel rounded-xl px-3 py-3 text-sm font-medium text-dourado-escuro">
              Importar do iPhone
            </Link>
          )
        }
      >
        {arquivadas ? "Arquivadas" : "Clientes"}
      </Titulo>
      {erro === "telefone" && (
        <div className="mb-4">
          <Aviso tipo="erro">Não deu para restaurar: já existe uma cliente ativa com esse telefone.</Aviso>
        </div>
      )}
      {falhou ? (
        <Aviso tipo="erro">Não deu para carregar as clientes. Puxe para atualizar.</Aviso>
      ) : (
        <ListaClientes clientes={clientes} arquivadas={arquivadas} />
      )}
      <Link
        href={arquivadas ? "/clientes" : "/clientes?arquivadas=1"}
        className="mt-6 block py-3 text-center text-sm font-medium text-secundario underline underline-offset-4"
      >
        {arquivadas ? "Voltar para as ativas" : "Ver arquivadas"}
      </Link>
      {!arquivadas && <BotaoFlutuante href="/clientes/nova" rotulo="Nova cliente" />}
    </>
  );
}
