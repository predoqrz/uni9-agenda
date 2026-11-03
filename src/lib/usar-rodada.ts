"use client";

import { useState } from "react";

/**
 * Número que muda a cada resposta de Server Action. Use como `key` do formulário
 * para o React remontá-lo e re-sincronizar <select>, rádios e checkboxes.
 */
export function useRodada(estado: unknown): number {
  const [rodada, setRodada] = useState(0);
  const [visto, setVisto] = useState(estado);
  if (visto !== estado) {
    setVisto(estado);
    setRodada((n) => n + 1);
  }
  return rodada;
}
