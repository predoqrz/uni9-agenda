import { FormularioLogin } from "./formulario";

export default function PaginaLogin() {
  return (
    <main className="flex min-h-dvh flex-col bg-branco">
      <section className="flex flex-1 flex-col items-center justify-center px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-10 text-center">
        <div
          aria-hidden
          className="mb-5 grid size-16 place-items-center rounded-full border-[1.5px] border-dourado bg-preto font-marca text-[1.625rem] font-semibold text-dourado"
        >
          B
        </div>
        <h1 className="font-marca text-[2.125rem] leading-none tracking-[0.06em]">
          <span className="font-semibold">BPQ</span>
        </h1>
        <p className="mt-3 text-sm text-secundario">Sua agenda, clientes e caixa</p>
      </section>

      <section className="entrada-painel rounded-t-[28px] bg-preto px-6 pt-8 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="mb-6 text-xl font-semibold text-balance text-dourado">Bom te ver de novo</h2>
          <FormularioLogin />
        </div>
      </section>
    </main>
  );
}
