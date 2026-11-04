#include <stdio.h>
#include "recorrencia.h"

static int falhas = 0;

static void vence(int32_t ano, int32_t mes, int32_t dia, int32_t esperado) {
  int32_t r = recorrencia_dia_vencimento(ano, mes, dia);
  if (r != esperado) {
    printf("FALHOU vencimento %d/%02d dia %d: %d (esperava %d)\n", ano, mes, dia, r, esperado);
    falhas++;
  }
}

int main(void) {
  vence(2026, 1, 31, 31);
  vence(2026, 4, 31, 30);
  vence(2026, 2, 31, 28);
  vence(2028, 2, 31, 29);  /* bissexto */
  vence(2100, 2, 29, 28);  /* múltiplo de 100: não é bissexto */
  vence(2000, 2, 30, 29);  /* múltiplo de 400: é bissexto */
  vence(2026, 2, 28, 28);
  vence(2026, 6, 15, 15);
  vence(2026, 12, 1, 1);
  vence(2026, 13, 10, 0);  /* mês inválido */
  vence(2026, 0, 10, 0);
  vence(2026, 5, 0, 0);    /* dia inválido */
  vence(2026, 5, 32, 0);

  if (recorrencia_dias_no_mes(2024, 2) != 29 || recorrencia_dias_no_mes(2023, 2) != 28) {
    printf("FALHOU dias de fevereiro\n");
    falhas++;
  }

  if (falhas) {
    printf("%d teste(s) falharam\n", falhas);
    return 1;
  }
  printf("recorrencia: todos os testes passaram\n");
  return 0;
}
