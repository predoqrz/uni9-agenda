import { connection } from "next/server";
import { Titulo } from "@/components/ui";
import { hoje } from "@/lib/tempo";
import { FormularioLancamento } from "../formularios";

// Usa "hoje": não pode ser pré-renderizada no build.
export default async function NovoLancamento() {
  await connection();
  return (
    <>
      <Titulo>Novo lançamento</Titulo>
      <FormularioLancamento
        id={null}
        inicial={{ tipo: "saida", esfera: "empresa", valor: "", data: hoje(), descricao: "", categoria: "", forma_pagamento: "" }}
      />
    </>
  );
}
