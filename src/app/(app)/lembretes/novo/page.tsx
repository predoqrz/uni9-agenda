import { Titulo } from "@/components/ui";
import { FormularioLembrete } from "../formulario-lembrete";

export default function NovoLembrete() {
  return (
    <>
      <Titulo>Novo lembrete</Titulo>
      <FormularioLembrete
        id={null}
        inicial={{
          id: "",
          nome: "",
          tipo: "retorno",
          mensagem: "Oi, {nome}! ",
          ativo: true,
          ordem: 99,
          dias: 21,
          categorias: [],
          avisar_antes: 7,
          mensagem_atrasada: null,
          limite_manutencoes: null,
          mensagem_nova_colocacao: null,
          sumir_apos: null,
        }}
      />
    </>
  );
}
