import { Titulo } from "@/components/ui";
import { FormularioServico } from "../formulario-servico";

export default function NovoServico() {
  return (
    <>
      <Titulo>Novo serviço</Titulo>
      <FormularioServico
        inicial={{
          id: null,
          nome: "",
          categoria: "extensao_cilios",
          preco: "",
          duracao_min: "60",
          sinal: "",
          custo: "",
          e_manutencao: false,
          ativo: true,
        }}
      />
    </>
  );
}
