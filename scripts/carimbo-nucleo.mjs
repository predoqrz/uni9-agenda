// Garante que o WebAssembly publicado foi compilado do código C atual.
//   node scripts/carimbo-nucleo.mjs gravar   (rodado pelo `make wasm`)
//   node scripts/carimbo-nucleo.mjs conferir (rodado antes do build)
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const pastas = ["nucleo/include", "nucleo/src"];
const carimbo = join(raiz, "src/lib/nucleo/nucleo.carimbo");
const wasm = join(raiz, "src/lib/nucleo/nucleo.wasm");
const embutido = join(raiz, "src/lib/nucleo/wasm-embutido.ts");

function hashDasFontes() {
  const h = createHash("sha256");
  for (const pasta of pastas) {
    for (const nome of readdirSync(join(raiz, pasta)).sort()) {
      if (!/\.[ch]$/.test(nome)) continue;
      // Ignora CRLF/LF para o hash ser igual no Windows e na Vercel.
      h.update(nome + "\n" + readFileSync(join(raiz, pasta, nome), "utf8").replace(/\r\n/g, "\n"));
    }
  }
  return h.digest("hex");
}

const modo = process.argv[2];
if (modo === "gravar") {
  // Embute o wasm em base64 num módulo TS: funciona igual no servidor e no
  // navegador, sem configurar o bundler para arquivos .wasm.
  const base64 = readFileSync(wasm).toString("base64");
  writeFileSync(
    embutido,
    `// Gerado por \`make wasm\`. Não edite à mão.\nexport const NUCLEO_WASM_BASE64 =\n  "${base64}";\n`,
  );
  writeFileSync(carimbo, hashDasFontes() + "\n");
  console.log("Carimbo do núcleo gravado.");
} else if (modo === "conferir") {
  if (!existsSync(embutido) || !existsSync(carimbo)) {
    console.error("Falta o núcleo compilado. Rode `make wasm` dentro de nucleo/.");
    process.exit(1);
  }
  if (readFileSync(carimbo, "utf8").trim() !== hashDasFontes()) {
    console.error(
      "O núcleo WebAssembly está desatualizado em relação ao código C. Rode `make wasm` dentro de nucleo/ e commite.",
    );
    process.exit(1);
  }
} else {
  console.error("Uso: node scripts/carimbo-nucleo.mjs gravar|conferir");
  process.exit(1);
}
