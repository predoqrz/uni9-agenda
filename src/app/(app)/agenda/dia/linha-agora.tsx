"use client";

import { useEffect, useRef, useState } from "react";
import { partes } from "@/lib/tempo";

/** Linha do "agora" (atualiza a cada minuto) e rolagem inicial até ela. */
export function LinhaAgora({ inicioGrade, fimGrade, pxPorMinuto }: { inicioGrade: number; fimGrade: number; pxPorMinuto: number }) {
  const [agora, setAgora] = useState(() => partes(new Date()).minutosDoDia);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setAgora(partes(new Date()).minutosDoDia), 60_000);
    ref.current?.scrollIntoView({ block: "center" });
    return () => clearInterval(id);
  }, []);

  if (agora < inicioGrade || agora > fimGrade) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute right-0 left-14 z-10 flex items-center"
      style={{ top: (agora - inicioGrade) * pxPorMinuto }}
    >
      <span className="-ml-1.5 size-3 rounded-full bg-erro" />
      <span className="h-0.5 flex-1 bg-erro" />
    </div>
  );
}
