#include <stdio.h>
#include <string.h>
#include "dinheiro.h"

static int falhas = 0;

static void ler(const char *texto, dinheiro_erro erro_esperado, int64_t esperado) {
  int64_t v = -1;
  dinheiro_erro e = dinheiro_ler(texto, &v);
  if (e != erro_esperado || (e == DINHEIRO_OK && v != esperado)) {
    printf("FALHOU ler(\"%s\"): erro %d valor %lld (esperava erro %d valor %lld)\n", texto, e,
           (long long)v, erro_esperado, (long long)esperado);
    falhas++;
  }
}

static void formatar(int64_t centavos, const char *esperado) {
  char buf[32];
  if (dinheiro_formatar(centavos, buf, sizeof buf) != DINHEIRO_OK || strcmp(buf, esperado) != 0) {
    printf("FALHOU formatar(%lld): \"%s\" (esperava \"%s\")\n", (long long)centavos, buf, esperado);
    falhas++;
  }
}

static void repartir(int64_t total, const int64_t *pesos, size_t n, const int64_t *esperado) {
  int64_t saida[64];
  if (dinheiro_repartir(total, pesos, n, saida) != DINHEIRO_OK) {
    printf("FALHOU repartir(%lld): erro\n", (long long)total);
    falhas++;
    return;
  }
  for (size_t i = 0; i < n; i++) {
    if (saida[i] != esperado[i]) {
      printf("FALHOU repartir(%lld) item %zu: %lld (esperava %lld)\n", (long long)total, i,
             (long long)saida[i], (long long)esperado[i]);
      falhas++;
    }
  }
}

int main(void) {
  /* Formatos aceitos */
  ler("120", DINHEIRO_OK, 12000);
  ler("120,50", DINHEIRO_OK, 12050);
  ler("120,5", DINHEIRO_OK, 12050);
  ler("1.234,56", DINHEIRO_OK, 123456);
  ler("120.50", DINHEIRO_OK, 12050);
  ler("120.5", DINHEIRO_OK, 12050);
  ler("1.234", DINHEIRO_OK, 123400);
  ler("1.234.567,89", DINHEIRO_OK, 123456789);
  ler(",50", DINHEIRO_OK, 50);
  ler("0,05", DINHEIRO_OK, 5);
  ler("120,", DINHEIRO_OK, 12000);
  ler("  R$ 35,90 ", DINHEIRO_OK, 3590);
  ler("R$1.000", DINHEIRO_OK, 100000);
  ler("0", DINHEIRO_OK, 0);

  /* Formatos recusados */
  ler("", DINHEIRO_VAZIO, 0);
  ler("   ", DINHEIRO_VAZIO, 0);
  ler(NULL, DINHEIRO_VAZIO, 0);
  ler("-10", DINHEIRO_INVALIDO, 0);
  ler("12a", DINHEIRO_INVALIDO, 0);
  ler("1,2,3", DINHEIRO_INVALIDO, 0);
  ler("1,234", DINHEIRO_INVALIDO, 0);
  ler("12.34.5", DINHEIRO_INVALIDO, 0);
  ler("1.23,45", DINHEIRO_INVALIDO, 0);
  ler("1234.567,00", DINHEIRO_INVALIDO, 0);
  ler("1,00.5", DINHEIRO_INVALIDO, 0);
  ler(",", DINHEIRO_INVALIDO, 0);
  ler(".", DINHEIRO_INVALIDO, 0);
  ler("R$", DINHEIRO_VAZIO, 0);
  ler("99999999999999999999", DINHEIRO_GRANDE, 0);
  ler("10.000.000.001", DINHEIRO_GRANDE, 0);

  /* Formatação */
  formatar(0, "R$ 0,00");
  formatar(5, "R$ 0,05");
  formatar(12050, "R$ 120,50");
  formatar(123456, "R$ 1.234,56");
  formatar(100000000, "R$ 1.000.000,00");
  formatar(-100, "-R$ 1,00");
  formatar(INT64_MIN, "-R$ 92.233.720.368.547.758,08");

  char pequeno[4];
  if (dinheiro_formatar(100, pequeno, sizeof pequeno) != DINHEIRO_ESPACO) {
    printf("FALHOU formatar com buffer pequeno\n");
    falhas++;
  }

  /* Repartição de desconto */
  { int64_t p[] = {15000, 5000}; int64_t e[] = {1500, 500}; repartir(2000, p, 2, e); }
  { int64_t p[] = {100, 100, 100}; int64_t e[] = {34, 33, 33}; repartir(100, p, 3, e); }
  { int64_t p[] = {100, 200}; int64_t e[] = {33, 67}; repartir(100, p, 2, e); }
  { int64_t p[] = {0, 0}; int64_t e[] = {1, 0}; repartir(1, p, 2, e); }
  { int64_t p[] = {0, 5000}; int64_t e[] = {0, 999}; repartir(999, p, 2, e); }
  { int64_t p[] = {DINHEIRO_MAXIMO, DINHEIRO_MAXIMO}; int64_t e[] = {DINHEIRO_MAXIMO / 2, DINHEIRO_MAXIMO / 2};
    repartir(DINHEIRO_MAXIMO, p, 2, e); }
  {
    int64_t s[2];
    int64_t p[] = {-1, 10};
    if (dinheiro_repartir(5, p, 2, s) != DINHEIRO_INVALIDO) { printf("FALHOU peso negativo\n"); falhas++; }
    if (dinheiro_repartir(5, p, 0, s) != DINHEIRO_INVALIDO) { printf("FALHOU n=0\n"); falhas++; }
  }

  if (falhas) {
    printf("%d teste(s) falharam\n", falhas);
    return 1;
  }
  printf("dinheiro: todos os testes passaram\n");
  return 0;
}
