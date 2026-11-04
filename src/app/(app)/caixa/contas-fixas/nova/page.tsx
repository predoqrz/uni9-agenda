import { connection } from "next/server";
import { Titulo } from "@/components/ui";
import { hoje } from "@/lib/tempo";
import { FormularioRecorrencia } from "../../formularios";

// Usa "hoje": não pode ser pré-renderizada no build.
export default async function NovaContaFixa() {
  await connection();
  return (
    <>
      <Titulo>Nova conta fixa</Titulo>
      <FormularioRecorrencia
        id={null}
        inicial={{ tipo: "saida", esfera: "empresa", valor: "", descricao: "", categoria: "", dia_mes: "10", comeca_em: hoje(), ativo: "on" }}
      />
    </>
  );
}
