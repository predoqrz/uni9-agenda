"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { entrar } from "./acoes";

const campo =
  "h-14 w-full rounded-2xl border border-grafite-linha bg-grafite text-branco px-4 text-base outline-none transition-colors placeholder:text-secundario-escuro focus:border-dourado";

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState(entrar, undefined);
  const [verSenha, setVerSenha] = useState(false);

  return (
    <form action={acao} className="flex flex-col gap-5" noValidate>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-branco">E-mail</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          defaultValue={estado?.email}
          required
          placeholder="voce@exemplo.com"
          className={campo}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-branco">Senha</span>
        <span className="relative">
          <input
            name="senha"
            type={verSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${campo} pr-14`}
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
            className="apertavel absolute right-1 top-1 grid size-12 place-items-center rounded-xl text-secundario-escuro hover:text-dourado"
          >
            {verSenha ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
          </button>
        </span>
      </label>

      <p role="alert" aria-live="polite" className="min-h-5 text-sm font-medium text-erro-escuro">
        {estado?.erro}
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="apertavel flex h-14 items-center justify-center gap-2 rounded-2xl bg-dourado text-base font-semibold text-preto shadow-[0_8px_24px_-10px_rgba(201,162,74,0.45)] hover:brightness-110 disabled:opacity-70"
      >
        {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
