import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { MenuPrincipal } from "@/components/menu";
import { checklistDeHoje } from "@/lib/checklist-dados";

/** Pendências do Checklist no ☰. Carrega à parte para não atrasar a página. */
async function ContadorChecklist() {
  let pendentes = 0;
  try {
    const { itens } = await checklistDeHoje();
    pendentes = itens.filter((i) => !i.feitoId).length;
  } catch (erro) {
    unstable_rethrow(erro); // deixa passar os sinais internos do Next (cookies, redirect)
    return null; // o contador é ajuda, não pode derrubar a página
  }
  if (pendentes === 0) return null;
  return (
      <span
        aria-label={`${pendentes} pendência(s) no Checklist`}
        className="absolute top-1 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-dourado px-1 text-[11px] font-bold text-preto tabular-nums"
      >
        {pendentes > 99 ? "99+" : pendentes}
      </span>
  );
}

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-branco">
      <MenuPrincipal
        contador={
          <Suspense fallback={null}>
            <ContadorChecklist />
          </Suspense>
        }
      />
      <main className="mx-auto w-full max-w-xl px-4 pt-5 pb-28">{children}</main>
    </div>
  );
}
