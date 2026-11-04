/*
 * Ponte para WebAssembly. O JavaScript escreve o texto em `nucleo_entrada`,
 * chama a função e lê a resposta em `nucleo_saida` / `nucleo_numeros`.
 * Sem malloc: buffers fixos, uma chamada por vez.
 */
#include "agenda.h"
#include "dinheiro.h"
#include "recorrencia.h"

#define EXPORTA(nome) __attribute__((export_name(#nome)))

static char entrada[256];
static char saida[32];
static int64_t numeros[65]; /* [0] = total, [1..n] = pesos; resposta volta em [1..n] */

EXPORTA(nucleo_entrada) char *nucleo_entrada(void) { return entrada; }
EXPORTA(nucleo_saida) char *nucleo_saida(void) { return saida; }
EXPORTA(nucleo_numeros) int64_t *nucleo_numeros(void) { return numeros; }

/* Lê `entrada` (já com '\0'); grava os centavos em numeros[0]. Devolve o código de erro. */
EXPORTA(nucleo_ler) int nucleo_ler(void) {
  entrada[sizeof entrada - 1] = '\0';
  return (int)dinheiro_ler(entrada, &numeros[0]);
}

/* Formata numeros[0] em `saida`. */
EXPORTA(nucleo_formatar) int nucleo_formatar(void) {
  return (int)dinheiro_formatar(numeros[0], saida, sizeof saida);
}

/* Reparte numeros[0] entre numeros[1..n]; a resposta substitui os pesos. */
EXPORTA(nucleo_repartir) int nucleo_repartir(int n) {
  if (n < 0 || n > 64) return DINHEIRO_INVALIDO;
  int64_t resposta[64];
  dinheiro_erro e = dinheiro_repartir(numeros[0], &numeros[1], (size_t)n, resposta);
  if (e == DINHEIRO_OK) {
    for (int i = 0; i < n; i++) numeros[1 + i] = resposta[i];
  }
  return (int)e;
}

/* Agenda: [0..n) inícios, [n..2n) fins, [2n..3n) e [3n..4n) respostas. */
static int32_t horarios[4 * AGENDA_MAX_ITENS];

EXPORTA(nucleo_horarios) int32_t *nucleo_horarios(void) { return horarios; }

/* Colunas lado a lado: grava coluna em [2n..3n) e total de colunas em [3n..4n). */
EXPORTA(nucleo_colunas) int nucleo_colunas(int n) {
  if (n < 0 || n > AGENDA_MAX_ITENS) return -1;
  size_t k = (size_t)n;
  return agenda_colunas(horarios, horarios + k, k, horarios + 2 * k, horarios + 3 * k);
}

/* Conflitos do novo horário com os n existentes; índices voltam em [2n..). Devolve quantos. */
EXPORTA(nucleo_conflitos) int nucleo_conflitos(int32_t novo_ini, int32_t novo_fim, int n) {
  if (n < 0 || n > AGENDA_MAX_ITENS) return -1;
  size_t k = (size_t)n;
  return agenda_conflitos(novo_ini, novo_fim, horarios, horarios + k, k, horarios + 2 * k);
}

/* Contas fixas: dia em que a conta cai no mês (0 = inválido). */
EXPORTA(nucleo_vencimento) int32_t nucleo_vencimento(int32_t ano, int32_t mes, int32_t dia) {
  return recorrencia_dia_vencimento(ano, mes, dia);
}

/* O otimizador às vezes troca laços por estas funções da libc; aqui não há libc. */
void *memset(void *d, int c, unsigned long n) {
  unsigned char *p = d;
  while (n--) *p++ = (unsigned char)c;
  return d;
}
void *memcpy(void *d, const void *s, unsigned long n) {
  unsigned char *p = d;
  const unsigned char *q = s;
  while (n--) *p++ = *q++;
  return d;
}
unsigned long strlen(const char *s) {
  const char *p = s;
  while (*p) p++;
  return (unsigned long)(p - s);
}
