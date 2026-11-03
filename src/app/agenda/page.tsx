import { sair } from "@/app/login/acoes";

// Provisória: a agenda de verdade chega na Fase 3.
export default function PaginaAgenda() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="font-marca text-2xl text-dourado-escuro">Agenda</h1>
      <p className="text-secundario">Login funcionando. A agenda chega na Fase 3.</p>
      <form action={sair}>
        <button className="apertavel h-12 rounded-2xl border border-linha px-5 font-medium hover:bg-superficie">
          Sair
        </button>
      </form>
    </main>
  );
}
