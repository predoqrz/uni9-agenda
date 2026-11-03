/*
 * Ponte para WebAssembly. O JavaScript escreve o texto em `nucleo_entrada`,
 * chama a função e lê a resposta em `nucleo_saida` / `nucleo_numeros`.
 * Sem malloc: buffers fixos, uma chamada por vez.
 */
#include "dinheiro.h"

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
