# BPQ — Agenda, clientes e caixa para um studio de beleza

Aplicativo web **mobile-first** para a gestão de um studio de cílios e sobrancelhas com uma única profissional.
Ele junta num lugar só o que antes ficava espalhado em caderno, planilha e conversas de WhatsApp:
**agenda, cadastro de clientes, serviços, caixa (empresa e pessoal) e o relacionamento com as clientes pelo WhatsApp**.

- **App no ar:** https://bpq-agenda.vercel.app
- **Repositório:** https://github.com/predoqrz/bpq-agenda

Projeto acadêmico que usa três linguagens, cada uma no papel em que ela é mais forte:
**TypeScript** (o aplicativo), **C** (o núcleo de cálculo) e **Python** (as ferramentas e os testes cruzados).

---

## Integrantes

| Nome | RA |
|---|---|
| Luana de Jesus Alves Vieira | 424200385 |
| Tainá Santos da Silva | 426200961 |
| Fábio Leandro de Sousa Cunha Filho | 425104899 |
| Jenniffer Carolina Silva | 2226201254 |
| Gabryelle Nathany da Silva Oliveira | 424202643 |
| Isabella de Oliveira Santos | 426109321 |
| Leticia Lemos Rocha | 424200859 |
| Brian Maran Pires | 426200480 |
| Beatriz Rodrigues Pereira da Silva Kumagai | 2526102714 |
| Pedro Perim de Queiroz | 424110067 |

---

## Sumário

1. [O problema e a solução](#o-problema-e-a-solução)
2. [Funcionalidades](#funcionalidades)
3. [Arquitetura](#arquitetura)
4. [Como usamos cada linguagem](#como-usamos-cada-linguagem)
5. [Banco de dados](#banco-de-dados)
6. [Princípios do projeto](#princípios-do-projeto)
7. [Estrutura de pastas](#estrutura-de-pastas)
8. [Como rodar o projeto](#como-rodar-o-projeto)
9. [Testes e verificação](#testes-e-verificação)
10. [Segurança e privacidade (LGPD)](#segurança-e-privacidade-lgpd)
11. [Decisões técnicas e armadilhas evitadas](#decisões-técnicas-e-armadilhas-evitadas)

---

## O problema e a solução

A usuária é uma profissional autônoma que atende sozinha, usa o celular com uma mão, em pé e com pressa,
entre um atendimento e outro. O dia a dia dela tinha quatro dores:

| Dor | Como o BPQ resolve |
|---|---|
| Horários anotados em vários lugares, encaixes esquecidos | Agenda com visão de mês, dia e lista; aviso automático de encaixe |
| Não saber quanto realmente entrou e quanto ainda vai entrar | Caixa que separa o **real** da **previsão**, por esfera (empresa / pessoal) |
| Esquecer de chamar a cliente para a manutenção, confirmar horário, dar parabéns | **Checklist do dia** que monta a lista de quem chamar com a mensagem já escrita |
| Contas de dinheiro feitas "de cabeça", com erro de centavo | Núcleo de cálculo em C, testado contra três implementações |

## Funcionalidades

O projeto foi construído em **6 fases**, cada uma uma fatia completa (banco + servidor + tela) testada no celular antes da próxima.

### Fase 1 — Fundação
- Login por e-mail e senha (Supabase Auth), com a usuária criada pelo painel (cadastro público desligado).
- `proxy.ts` protegendo todas as páginas; deploy automático na Vercel (região São Paulo).

### Fase 2 — Cadastros
- **Clientes:** lista com busca enquanto digita (sem acento, por pedaços do nome ou pelo telefone), cadastro, edição, arquivar e restaurar.
- **Importar contatos do iPhone:** lê um arquivo `.vcf` no próprio navegador, lista com caixinhas (começando sem nenhuma marcada), pula quem já existe pelo telefone e normaliza números (`+55`, `0xx`, sem DDD).
- **Serviços:** catálogo com preço, duração, categoria, manutenção, sinal de reserva e custo de material. O valor digitado é lido pelo núcleo C e o app mostra ao vivo como entendeu ("Entendi R$ 120,50").

### Fase 3 — Agenda
- **Visão do mês:** calendário com pontinhos por dia e painel do dia escolhido.
- **Visão do dia:** grade de horários (07:30–20:00, estica se preciso), blocos com altura proporcional à duração, **encaixes lado a lado**, linha do "agora" e toque num horário vazio para marcar.
- **Lista por período** (de/até).
- **Atendimento:** cliente e serviços com busca, vários procedimentos com valor editável, desconto em R$, total ao vivo, duração somada (editável), status com um toque.
- **Aviso de encaixe** com "Marcar mesmo assim" — o app avisa, nunca bloqueia.
- **Sinal de reserva** (não reembolsável) com forma de pagamento e "falta cobrar no dia".

### Fase 4 — Caixa
- Entradas, saídas e **transferências** entre empresa e pessoal (ex.: pró-labore muda o saldo de cada esfera, não o total).
- **Receita só conta quando o atendimento é realizado** (gatilho no banco). Se o sinal foi pago, entra só o restante. Cancelar ou faltar não devolve o sinal.
- **A receber** e **contas fixas a vencer** num quadro de **previsão separado** do saldo real.
- **Capital de giro:** sinais recebidos, faturamento, custo de material, lucro estimado e "reserve R$ X para repor material".
- **Contas fixas** que viram lançamento sozinhas no vencimento, sem duplicar (dia 31 cai no último dia dos meses curtos).
- Seletor de **mês ou período livre** com atalhos e **relatórios**: clientes novas, ranking de procedimentos, faturamento e lucro com o desconto repartido proporcionalmente.

### Fase 5 — Ficha da cliente
- Dados, idade e próximo aniversário, resumo (visitas, total gasto, faltas), próximo horário, histórico completo.
- Botões **Marcar** e **WhatsApp**, e **Enviar mensagem pronta** com prévia de "como ela vai receber".

### Fase 6 — Relacionamento por WhatsApp
- **Checklist do dia:** lista de quem chamar, agrupada por lembrete, com botão que abre o WhatsApp com a mensagem já escrita (`https://wa.me/55NUMERO?text=…`) e "Feito" (com desfazer). **O app nunca envia nada sozinho.**
- **Lembretes 100% editáveis**, de quatro tipos:
  1. **Retorno** — N dias depois do último atendimento realizado das categorias escolhidas, avisando X dias antes; some se a cliente já tem horário; mensagem diferente após o prazo; limite de manutenções seguidas (a 4ª vira "nova colocação"); some N dias depois do prazo.
  2. **Pós-atendimento** — N dias depois de cada atendimento.
  3. **Confirmação** — N dias antes do horário; "Confirmou" muda o status para Confirmado.
  4. **Aniversário** — N dias antes (0 = no dia).
- Marcadores `{nome}`, `{servico}`, `{data}`, `{hora}` e `{prazo}`, com prévia.
- Tela de **Mensagens** com as prontas e o texto de cada lembrete; contador de pendências no próprio menu ☰.

## Arquitetura

```
                ┌──────────────────────────── Celular (navegador) ────────────────────────────┐
                │  Telas React (Next.js)  ──►  nucleo.wasm (C compilado para WebAssembly)      │
                └───────────────┬──────────────────────────────────────────────────────────────┘
                                │ Server Actions / Server Components
                ┌───────────────▼──────────── Vercel (gru1, São Paulo) ────────────────────────┐
                │  Next.js 16 (TypeScript)  ──►  nucleo.wasm (mesmo C, agora no servidor)      │
                └───────────────┬──────────────────────────────────────────────────────────────┘
                                │ @supabase/ssr (cookies) — só usuária logada
                ┌───────────────▼──────────── Supabase (sa-east-1, São Paulo) ─────────────────┐
                │  Postgres + Auth + RLS · gatilhos (agenda → caixa) · funções (salvar, gerar) │
                └──────────────────────────────────────────────────────────────────────────────┘

   Computador da profissional / da equipe:
     ferramentas/ (Python)  ──►  nucleo/bin/bpq.dll (o mesmo C, via ctypes)  ──►  API do Supabase
     testes_cruzados/ (pytest + hypothesis)  ──►  compara C nativo × WebAssembly × Python
```

**Stack**

| Camada | Tecnologia |
|---|---|
| Aplicativo | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Visual | Tailwind CSS 4, lucide-react, fontes Cinzel + Montserrat; design no Figma |
| Dados | Supabase (Postgres + Auth + Row Level Security) via `@supabase/ssr` |
| Datas | date-fns 4 + `@date-fns/tz` (fuso fixo `America/Sao_Paulo`) |
| Validação | Zod (Server Action + `useActionState` + Zod) |
| Núcleo de cálculo | C11, compilado com clang (nativo e `--target=wasm32`) |
| Ferramentas e testes | Python 3.12, uv, pytest, hypothesis, ruff, httpx, openpyxl |
| Hospedagem | Vercel (região `gru1`) + GitHub |

## Como usamos cada linguagem

A regra foi **cada linguagem fazer o que faz melhor**, sem reescrever o aplicativo inteiro em C ou Python.

### TypeScript — o aplicativo (`src/`)

Todas as telas, a navegação, os formulários e a conversa com o banco.

- **Server Components por padrão**; `"use client"` só onde há interação (busca enquanto digita, formulários, menu).
- **Toda mutação é uma Server Action** validada com **Zod**. O navegador nunca fala direto com o banco.
- Uma **camada tipada** (`src/lib/nucleo/index.ts`) embrulha o WebAssembly; o resto do app só chama funções como `lerDinheiro("1.234,56")`, `formatarDinheiro(123456)`, `conflitosDeHorario(...)` e `colunasDoDia(...)`.
- Regras de negócio que não envolvem dinheiro ou horário (checklist, telefone, caixa por esfera) ficam em módulos TypeScript puros em `src/lib/`, fáceis de testar.

### C — o núcleo de cálculo (`nucleo/`)

As regras em que um erro custa **dinheiro ou horário** moram numa biblioteca pequena em C, sem dependências, que é a **fonte da verdade**:

| Arquivo | O que faz |
|---|---|
| `dinheiro.c` | Lê o valor digitado (`"120"`, `"120,50"`, `"1.234,56"`, `"120.50"`, `",50"`, `"R$ 35,90"`) para **centavos inteiros** (`int64_t`); formata centavos como `"R$ 1.234,56"`; **reparte um desconto** proporcionalmente entre procedimentos sem perder nem sobrar centavo (multiplicação/divisão de 128 bits emulada, o resto vai para os maiores restos). |
| `agenda.c` | Detecta **encaixes** (sobreposição de intervalos; só encostar não conta) e calcula as **colunas lado a lado** da visão do dia. |
| `recorrencia.c` | Dia de vencimento de conta fixa no mês (dia 31 → último dia nos meses curtos, ano bissexto incluso). |
| `wasm.c` | Ponte para o WebAssembly: buffers fixos, sem `malloc`, funções exportadas. |
| `cli.c` | Programa de linha de comando usado pelos testes cruzados. |

O mesmo código C é compilado de **três formas**:

1. **WebAssembly** (`make wasm`): `clang --target=wasm32 -nostdlib`, sem libc. O `.wasm` (~2 KB) é embutido em base64 num módulo TypeScript e roda **no servidor e no celular**.
2. **Programa nativo** (`make` → `nucleo/bin/bpq`): usado pelos testes cruzados.
3. **Biblioteca compartilhada** (`bpq.dll` / `libbpq.so`): chamada pelo Python com `ctypes`.

Regras de código do núcleo: C11, `-Wall -Wextra -Werror -pedantic`, **nunca `float`/`double` em dinheiro**, sem `malloc` nas funções de cálculo, toda função documenta entradas inválidas e devolve código de erro. Os testes em C rodam com **AddressSanitizer e UndefinedBehaviorSanitizer**.

Um **carimbo** (`src/lib/nucleo/nucleo.carimbo`, hash SHA-256 do código C) é conferido antes de todo build: **se alguém mudar o C e esquecer de recompilar o WebAssembly, o build da Vercel falha**.

### Python — ferramentas e testes cruzados (`ferramentas/`)

Tarefas que rodam fora do app, no computador:

- **`importar_planilha.py`** — importa clientes ou serviços de uma planilha antiga (`.xlsx` ou `.csv`). Por padrão só **simula** (mostra o que entraria e o que seria pulado); grava apenas com `--confirmar`. Pula duplicadas pelo telefone, converte datas e lê valores **pelo núcleo C via `ctypes`** (o Python não reimplementa a regra de dinheiro). A chave secreta do Supabase é lida **só** de variável de ambiente no momento de rodar.
- **`bpq/nucleo.py`** — ponte `ctypes` para a biblioteca C.
- **`bpq/telefone.py`** — normalização de telefone igual à do app.
- **`testes_cruzados/`** — **pytest + hypothesis** geram milhares de casos (inclusive aleatórios) e conferem que **o C nativo, o C via `ctypes` e o WebAssembly do app dão exatamente o mesmo resultado**:
  - leitura e formatação de dinheiro (e que formatar e ler de volta dá o mesmo valor);
  - repartição de desconto (a soma sempre bate com o total);
  - encaixes e colunas da agenda (conferidos contra uma definição direta em Python);
  - vencimento de contas fixas (conferido contra o módulo `calendar` do Python);
  - normalização de telefone (Python × TypeScript);
  - regras da importação de planilha.

## Banco de dados

Postgres no Supabase (região São Paulo). As mudanças vêm como arquivos SQL numerados em `supabase/migrations/`.

| Tabela | Conteúdo |
|---|---|
| `clientes` | nome, telefone (só dígitos, com DDD), nascimento, rede social, observações (preferências) |
| `servicos` | nome, preço, duração, categoria, manutenção, sinal e custo (centavos) |
| `atendimentos` | cliente, início/fim, status, valor cobrado, desconto, sinal (valor, data e forma de pagamento) |
| `atendimento_itens` | os procedimentos de cada atendimento, com valor e custo |
| `lancamentos` | caixa: entrada / saída / transferência, esfera, valor, data, origem |
| `recorrencias` | contas fixas (dia do mês, valor, começa em) |
| `mensagens_prontas` | biblioteca livre de textos |
| `lembretes` | regras do Checklist (tipo, dias, categorias, mensagens, limites) |
| `contatos` | contatos feitos ("Feito" do checklist), por ocasião |

Lógica que mora no próprio banco:

- **`salvar_atendimento`** — salva o atendimento e os procedimentos numa transação só e **recalcula os totais no banco**, sem confiar no navegador.
- **`atendimento_no_caixa`** (gatilho) — quando o atendimento vira "realizado", cria a receita (só o restante, se o sinal foi pago); desfazer arquiva; sinal pago entra no dia do pagamento e não é devolvido.
- **`gerar_recorrencias`** — lança as contas fixas vencidas sem duplicar (índice único por mês, contando as arquivadas).

## Princípios do projeto

1. **Avisa, nunca bloqueia.** Encaixe de horário gera aviso com "Marcar mesmo assim". A agenda é dela.
2. **Nada é apagado de verdade.** Toda tabela tem `deleted_at`; "excluir" arquiva e as telas filtram `deleted_at is null`.
3. **Uma mão, em pé, com pressa.** Alvos de toque de 48 px ou mais, testado em 375 px de largura, cartões em vez de tabelas largas.
4. **Nada engessado.** Mensagens, regras de lembrete, preços, sinais e custos são editáveis pela profissional, sem mexer em código.
5. **Dinheiro é sempre inteiro em centavos.** Nunca ponto flutuante.
6. **Fuso fixo `America/Sao_Paulo`**, nem o do navegador nem o do servidor.

## Estrutura de pastas

```
bpq-agenda/
├── src/
│   ├── app/
│   │   ├── login/                 tela de entrada
│   │   └── (app)/                 área logada (menu ☰ + contador do checklist)
│   │       ├── agenda/            mês, dia, lista, novo/editar atendimento
│   │       ├── checklist/         checklist do dia
│   │       ├── clientes/          lista, ficha, edição, importar .vcf
│   │       ├── servicos/          catálogo
│   │       ├── caixa/             lançamentos, contas fixas, relatórios
│   │       ├── lembretes/         regras do checklist
│   │       └── mensagens/         mensagens prontas
│   ├── components/                peças visuais (menu, botões, campos)
│   ├── lib/
│   │   ├── nucleo/                camada TypeScript + WebAssembly do núcleo C
│   │   ├── supabase/              cliente do servidor e busca em blocos
│   │   ├── tempo.ts               datas no fuso de São Paulo
│   │   ├── caixa.ts, checklist.ts, telefone.ts, vcf.ts, mensagens.ts …
│   └── proxy.ts                   protege as páginas (Next.js 16)
├── nucleo/                        núcleo em C
│   ├── include/  src/  testes/
│   └── Makefile                   make · make test · make wasm · make lib
├── ferramentas/                   Python
│   ├── bpq/                       ponte ctypes + telefone
│   ├── importar_planilha.py
│   └── testes_cruzados/
├── supabase/migrations/           0001 … 0005 (SQL)
└── scripts/                       carimbo do núcleo e ponte TS para os testes
```

## Como rodar o projeto

### Pré-requisitos

- **Node.js 24** e npm
- **clang** com libc para o programa nativo (no Windows usamos o *llvm-mingw*) e **LLVM/clang** com o alvo `wasm32`
- **make**
- **uv** (instala e gerencia o Python 3.12)
- Um projeto no **Supabase** com as migrations de `supabase/migrations/` aplicadas

No Windows, tudo pode ser instalado pelo `winget`:

```bash
winget install LLVM.LLVM MartinStorsjo.LLVM-MinGW.UCRT ezwinports.make astral-sh.uv
```

### Aplicativo

```bash
npm install
cp .env.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                  # http://localhost:3000
```

O build falha com uma mensagem clara se faltar alguma variável de ambiente.

### Núcleo C

```bash
make -C nucleo          # programa nativo + biblioteca para o Python
make -C nucleo test     # testes em C com AddressSanitizer e UBSan
make -C nucleo wasm     # recompila o WebAssembly (commite o resultado)
```

Para o WebAssembly, informe o clang do LLVM se ele não for o padrão: `make -C nucleo wasm WASM_CC="C:/Program Files/LLVM/bin/clang.exe"`.

### Ferramentas Python

```bash
cd ferramentas
uv sync
uv run pytest -q                                              # testes cruzados
SUPABASE_SECRET_KEY=sb_secret_... uv run python importar_planilha.py clientes antigas.xlsx            # simula
SUPABASE_SECRET_KEY=sb_secret_... uv run python importar_planilha.py clientes antigas.xlsx --confirmar
```

## Testes e verificação

Um único comando roda tudo:

```bash
npm run verificar
```

Ele executa, em ordem: `type-check` (TypeScript), `lint` (ESLint), `build` (que confere o carimbo do núcleo), `make test` (testes em C) e `ruff` + `pytest` (Python).

| Camada | O que é testado |
|---|---|
| C | casos de borda de dinheiro (`"1.234"`, `",50"`, vazio, negativo, estouro, `INT64_MIN`), repartição, encaixes, colunas, 31/02 e anos bissextos — com sanitizers |
| Cruzados | C nativo × C via `ctypes` × WebAssembly, com milhares de entradas aleatórias (hypothesis) |
| Banco | funções e gatilhos testados em transações que são desfeitas no final |
| Fuso | contas de data rodadas com o computador em `TZ=Asia/Tokyo` para garantir que só São Paulo conta |

## Segurança e privacidade (LGPD)

- Banco na região do Brasil (São Paulo).
- **Row Level Security em todas as tabelas**: só a usuária logada lê e escreve; nada é liberado para visitantes anônimos.
- **Cadastro público desligado**: a usuária é criada pelo painel.
- A chave `sb_publishable_…` pode ir ao navegador; a chave secreta **nunca** fica no código, no `.env.local` ou no repositório.
- O app **não coleta dado de saúde**: o campo de observações é só para preferências da cliente.
- O app **não envia mensagens sozinho**: só abre o WhatsApp com o texto pronto.

## Decisões técnicas e armadilhas evitadas

- **Next.js 16:** o antigo `middleware.ts` agora é `proxy.ts`; o proxy usa `getClaims()` (valida localmente). `loading.tsx` em toda rota. Páginas que usam "hoje" chamam `await connection()` para não congelarem a data no build. Dentro de `try/catch` em Server Components usamos `unstable_rethrow`.
- **Supabase:** cookies com `getAll`/`setAll`; consultas que podem passar de 1000 linhas são feitas **em blocos com `.range()`** (o Supabase corta em silêncio). Índice de "primeiro dia do mês" escrito como `data - (dia - 1)`, porque `date_trunc` em `date` não é aceito em índice.
- **Datas:** `TZDate.toISOString()` devolve `-03:00`, não UTC; para gravar, usamos `new Date(instante.getTime()).toISOString()`.
- **React 19 + formulários:** depois de uma Server Action o formulário é **remontado com uma `key`** que muda a cada resposta, para `<select>`, rádios e checkboxes mostrarem exatamente o que a pessoa acabou de enviar.
- **WebAssembly sem Emscripten:** como o núcleo não usa libc, o próprio clang gera o `.wasm` com `--target=wasm32 -nostdlib`, o que deixa o build simples e o arquivo com ~2 KB.
- **Gráficos:** paleta dourado (entradas) e ameixa (saídas) validada para daltonismo, com eixo único começando em zero e opção "Ver como tabela".
