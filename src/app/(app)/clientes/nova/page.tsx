import { Titulo } from "@/components/ui";
import { FormularioCliente } from "../formulario-cliente";

export default function NovaCliente() {
  return (
    <>
      <Titulo>Nova cliente</Titulo>
      <FormularioCliente
        inicial={{ id: null, nome: "", telefone: "", nascimento: "", rede_social: "", observacoes: "" }}
      />
    </>
  );
}
