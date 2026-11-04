"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, ListChecks, Menu, MessageSquareText, Scissors, Users, Wallet, X } from "lucide-react";
import { sair } from "@/app/login/acoes";

const ITENS = [
  { href: "/agenda", rotulo: "Agenda", Icone: CalendarDays },
  { href: "/checklist", rotulo: "Checklist", Icone: ListChecks },
  { href: "/clientes", rotulo: "Clientes", Icone: Users },
  { href: "/servicos", rotulo: "Serviços", Icone: Scissors },
  { href: "/caixa", rotulo: "Caixa", Icone: Wallet },
  { href: "/mensagens", rotulo: "Mensagens", Icone: MessageSquareText },
];

/** Barra fina no topo com ☰ que abre o menu lateral pela esquerda. */
/** `contador` = pendências do Checklist, mostradas no próprio ☰. */
export function MenuPrincipal({ contador }: { contador?: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();

  // Fecha ao navegar e com Esc.
  const [caminhoVisto, setCaminhoVisto] = useState(caminho);
  if (caminhoVisto !== caminho) {
    setCaminhoVisto(caminho);
    setAberto(false);
  }
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-linha bg-branco/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          className="apertavel relative grid size-12 place-items-center rounded-xl hover:bg-superficie"
        >
          <Menu size={22} strokeWidth={1.75} />
          {contador}
        </button>
        <span className="font-marca text-lg tracking-[0.06em]">
          <span className="font-semibold">UNI9</span>
          <span className="text-dourado-escuro">-AGENDA</span>
        </span>
      </header>

      <div
        aria-hidden={!aberto}
        onClick={() => setAberto(false)}
        className={`fixed inset-0 z-40 bg-preto/40 transition-opacity duration-300 ${aberto ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <nav
        aria-label="Menu principal"
        inert={!aberto}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(80vw,300px)] flex-col bg-preto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-branco transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${aberto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-marca text-lg tracking-[0.06em]">
            <span className="font-semibold">UNI9</span>
            <span className="text-dourado">-AGENDA</span>
          </span>
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
            className="apertavel grid size-12 place-items-center rounded-xl text-secundario-escuro hover:text-dourado"
          >
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {ITENS.map(({ href, rotulo, Icone }) => {
            const ativo = caminho.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`apertavel flex h-14 items-center gap-3 rounded-2xl px-4 text-base font-medium ${ativo ? "bg-grafite text-dourado" : "text-branco hover:bg-grafite"}`}
                >
                  <Icone size={20} strokeWidth={1.75} />
                  {rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={sair} className="mt-auto">
          <button className="apertavel flex h-12 w-full items-center rounded-2xl px-4 text-secundario-escuro hover:text-branco">
            Sair
          </button>
        </form>
      </nav>
    </>
  );
}
