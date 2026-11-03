import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Peças visuais pequenas e repetidas. Tokens iguais aos do Figma (coleção "Cores").

export const estiloCampo =
  "h-14 w-full rounded-2xl border border-linha bg-branco px-4 text-base outline-none transition-colors placeholder:text-secundario focus:border-dourado";

export function Campo({
  rotulo,
  erro,
  dica,
  children,
}: {
  rotulo: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{rotulo}</span>
      {children}
      {erro ? (
        <span className="text-sm font-medium text-erro">{erro}</span>
      ) : dica ? (
        <span className="text-sm text-secundario">{dica}</span>
      ) : null}
    </label>
  );
}

export function BotaoPrincipal({ children, className = "", ...resto }: ComponentProps<"button">) {
  return (
    <button
      {...resto}
      className={`apertavel flex h-14 items-center justify-center gap-2 rounded-2xl bg-dourado px-6 text-base font-semibold text-preto shadow-[0_8px_24px_-10px_rgba(201,162,74,0.45)] hover:brightness-110 disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({ children, className = "", ...resto }: ComponentProps<"button">) {
  return (
    <button
      {...resto}
      className={`apertavel flex h-12 items-center justify-center gap-2 rounded-2xl border border-linha px-5 font-medium hover:bg-superficie disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

/** Botão flutuante "+" no canto. */
export function BotaoFlutuante({ href, rotulo }: { href: string; rotulo: string }) {
  return (
    <Link
      href={href}
      aria-label={rotulo}
      className="apertavel fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 grid size-16 place-items-center rounded-full bg-preto text-dourado shadow-[0_10px_30px_-8px_rgba(17,17,17,0.5)]"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}

export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h1 className="font-marca text-2xl font-semibold tracking-[0.03em]">{children}</h1>
      {acao}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "ok" | "erro"; children: ReactNode }) {
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm font-medium ${tipo === "erro" ? "bg-erro/10 text-erro" : "bg-superficie text-dourado-escuro"}`}
    >
      {children}
    </p>
  );
}
