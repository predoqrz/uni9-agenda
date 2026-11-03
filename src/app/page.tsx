import { redirect } from "next/navigation";

// O app abre na tela mais usada: a agenda.
export default function Inicio() {
  redirect("/agenda");
}
