import { Titulo } from "@/components/ui";
import { FormularioMensagem } from "../formulario-mensagem";

export default function NovaMensagem() {
  return (
    <>
      <Titulo>Nova mensagem</Titulo>
      <FormularioMensagem id={null} inicial={{ titulo: "", texto: "Oi, {nome}! " }} />
    </>
  );
}
