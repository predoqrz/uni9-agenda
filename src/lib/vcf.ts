// Leitor simples de .vcf (vCard 2.1/3.0/4.0), como o iPhone exporta.

export type ContatoVcf = { nome: string; telefones: string[] };

/** Junta linhas dobradas (continuação começa com espaço ou tab). */
function desdobrar(texto: string): string[] {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");
  const saida: string[] = [];
  for (const l of linhas) {
    if ((l.startsWith(" ") || l.startsWith("\t")) && saida.length) saida[saida.length - 1] += l.slice(1);
    else saida.push(l);
  }
  return saida;
}

function decodificarValor(valor: string, params: string): string {
  if (/ENCODING=QUOTED-PRINTABLE/i.test(params)) {
    const bytes: number[] = [];
    const limpo = valor.replace(/=\n/g, "");
    for (let i = 0; i < limpo.length; i++) {
      if (limpo[i] === "=" && /^[0-9A-F]{2}$/i.test(limpo.slice(i + 1, i + 3))) {
        bytes.push(parseInt(limpo.slice(i + 1, i + 3), 16));
        i += 2;
      } else bytes.push(limpo.charCodeAt(i));
    }
    valor = new TextDecoder().decode(new Uint8Array(bytes));
  }
  return valor.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

export function lerVcf(texto: string): ContatoVcf[] {
  const contatos: ContatoVcf[] = [];
  let atual: { fn: string; n: string; org: string; telefones: string[] } | null = null;

  for (const linha of desdobrar(texto)) {
    const doisPontos = linha.indexOf(":");
    if (doisPontos < 0) continue;
    const cabeca = linha.slice(0, doisPontos);
    const valor = linha.slice(doisPontos + 1);
    const [propriedadeBruta, ...resto] = cabeca.split(";");
    // Tira o prefixo de grupo do iPhone ("item1.TEL").
    const propriedade = propriedadeBruta.replace(/^[^.]+\./, "").toUpperCase();
    const params = resto.join(";");

    if (propriedade === "BEGIN" && /VCARD/i.test(valor)) atual = { fn: "", n: "", org: "", telefones: [] };
    else if (!atual) continue;
    else if (propriedade === "END") {
      const nome = atual.fn || atual.n || atual.org;
      if (nome && atual.telefones.length) contatos.push({ nome, telefones: atual.telefones });
      atual = null;
    } else if (propriedade === "FN") atual.fn = decodificarValor(valor, params);
    else if (propriedade === "N") {
      const [sobrenome, nome, meio] = decodificarValor(valor, params).split(";");
      atual.n = [nome, meio, sobrenome].filter(Boolean).join(" ").trim();
    } else if (propriedade === "ORG") atual.org = decodificarValor(valor, params).split(";")[0];
    else if (propriedade === "TEL") {
      const tel = decodificarValor(valor, params).replace(/^tel:/i, "");
      if (tel) atual.telefones.push(tel);
    }
  }
  return contatos;
}
