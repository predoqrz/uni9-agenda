#include <stdio.h>
#include "agenda.h"

static int falhas = 0;

#define CONFERE(cond, ...)       \
  do {                           \
    if (!(cond)) {               \
      printf("FALHOU: ");        \
      printf(__VA_ARGS__);       \
      printf("\n");              \
      falhas++;                  \
    }                            \
  } while (0)

static void colunas(const int32_t *ini, const int32_t *fim, size_t n, const int32_t *col_esp,
                    const int32_t *tot_esp, const char *nome) {
  int32_t col[AGENDA_MAX_ITENS], tot[AGENDA_MAX_ITENS];
  CONFERE(agenda_colunas(ini, fim, n, col, tot) == 0, "%s: erro", nome);
  for (size_t i = 0; i < n; i++) {
    CONFERE(col[i] == col_esp[i] && tot[i] == tot_esp[i], "%s item %zu: coluna %d de %d (esperava %d de %d)", nome, i,
            col[i], tot[i], col_esp[i], tot_esp[i]);
  }
}

int main(void) {
  /* Sobreposição */
  CONFERE(agenda_sobrepoe(600, 660, 630, 700), "cruza no meio");
  CONFERE(!agenda_sobrepoe(600, 660, 660, 720), "só encosta não é encaixe");
  CONFERE(!agenda_sobrepoe(660, 720, 600, 660), "só encosta (ao contrário)");
  CONFERE(agenda_sobrepoe(600, 720, 630, 640), "um dentro do outro");
  CONFERE(agenda_sobrepoe(600, 660, 600, 660), "mesmo horário");

  /* Conflitos */
  {
    int32_t ini[] = {540, 600, 660, 720};
    int32_t fim[] = {600, 660, 720, 780};
    int32_t saida[4];
    CONFERE(agenda_conflitos(630, 690, ini, fim, 4, saida) == 2 && saida[0] == 1 && saida[1] == 2, "dois conflitos");
    CONFERE(agenda_conflitos(780, 840, ini, fim, 4, saida) == 0, "nenhum conflito");
    CONFERE(agenda_conflitos(700, 600, ini, fim, 4, saida) == -1, "novo invertido");
    int32_t ruim_fim[] = {600, 600, 720, 780};
    CONFERE(agenda_conflitos(630, 690, ini, ruim_fim, 4, saida) == -1, "existente com fim = início");
    CONFERE(agenda_conflitos(630, 690, NULL, NULL, 0, NULL) == 0, "lista vazia");
  }

  /* Colunas */
  {
    int32_t ini[] = {600};
    int32_t fim[] = {660};
    int32_t c[] = {0}, t[] = {1};
    colunas(ini, fim, 1, c, t, "sozinho");
  }
  {
    /* 10:00–11:00 e 10:30–11:30 lado a lado; 12:00 sozinho */
    int32_t ini[] = {600, 630, 720};
    int32_t fim[] = {660, 690, 780};
    int32_t c[] = {0, 1, 0}, t[] = {2, 2, 1};
    colunas(ini, fim, 3, c, t, "dois lado a lado");
  }
  {
    /* Encostados não dividem coluna */
    int32_t ini[] = {600, 660};
    int32_t fim[] = {660, 720};
    int32_t c[] = {0, 0}, t[] = {1, 1};
    colunas(ini, fim, 2, c, t, "encostados");
  }
  {
    /* A longo (9–12) cruza B (9:30–10) e C (10:30–11): B e C reaproveitam a coluna 1 */
    int32_t ini[] = {540, 570, 630};
    int32_t fim[] = {720, 600, 660};
    int32_t c[] = {0, 1, 1}, t[] = {2, 2, 2};
    colunas(ini, fim, 3, c, t, "reaproveita coluna");
  }
  {
    /* Três ao mesmo tempo; entrada fora de ordem; empate de início, o mais longo primeiro */
    int32_t ini[] = {630, 600, 600};
    int32_t fim[] = {700, 640, 700};
    int32_t c[] = {2, 1, 0}, t[] = {3, 3, 3};
    colunas(ini, fim, 3, c, t, "três juntos");
  }
  {
    int32_t ini[] = {600}, fim[] = {600}, c[1], t[1];
    CONFERE(agenda_colunas(ini, fim, 1, c, t) == -1, "duração zero");
    CONFERE(agenda_colunas(NULL, NULL, 0, NULL, NULL) == 0, "dia vazio");
  }
  {
    /* Máximo de itens, todos encadeados */
    int32_t ini[AGENDA_MAX_ITENS], fim[AGENDA_MAX_ITENS], c[AGENDA_MAX_ITENS], t[AGENDA_MAX_ITENS];
    for (int i = 0; i < AGENDA_MAX_ITENS; i++) {
      ini[i] = i * 10;
      fim[i] = i * 10 + 15;
    }
    CONFERE(agenda_colunas(ini, fim, AGENDA_MAX_ITENS, c, t) == 0 && t[0] == 2 && c[1] == 1 && c[2] == 0,
            "cadeia longa");
    CONFERE(agenda_colunas(ini, fim, AGENDA_MAX_ITENS + 1, c, t) == -1, "itens demais");
  }

  if (falhas) {
    printf("%d teste(s) falharam\n", falhas);
    return 1;
  }
  printf("agenda: todos os testes passaram\n");
  return 0;
}
