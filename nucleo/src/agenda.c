#include "agenda.h"

/* Sem libc: este arquivo também é compilado para WebAssembly puro. */

int agenda_sobrepoe(int32_t a_ini, int32_t a_fim, int32_t b_ini, int32_t b_fim) {
  return a_ini < b_fim && b_ini < a_fim;
}

static int intervalos_validos(const int32_t *ini, const int32_t *fim, size_t n) {
  if (n > AGENDA_MAX_ITENS) return 0;
  if (n > 0 && (!ini || !fim)) return 0;
  for (size_t i = 0; i < n; i++) {
    if (fim[i] <= ini[i]) return 0;
  }
  return 1;
}

int agenda_conflitos(int32_t novo_ini, int32_t novo_fim, const int32_t *ini, const int32_t *fim, size_t n,
                     int32_t *saida) {
  if (novo_fim <= novo_ini || !intervalos_validos(ini, fim, n) || (n > 0 && !saida)) return -1;
  int total = 0;
  for (size_t i = 0; i < n; i++) {
    if (agenda_sobrepoe(novo_ini, novo_fim, ini[i], fim[i])) saida[total++] = (int32_t)i;
  }
  return total;
}

/* a vem antes de b: começa antes; no empate, o mais longo primeiro; depois a ordem de entrada. */
static int vem_antes(const int32_t *ini, const int32_t *fim, int32_t a, int32_t b) {
  if (ini[a] != ini[b]) return ini[a] < ini[b];
  if (fim[a] != fim[b]) return fim[a] > fim[b];
  return a < b;
}

int agenda_colunas(const int32_t *ini, const int32_t *fim, size_t n, int32_t *coluna, int32_t *colunas) {
  if (!intervalos_validos(ini, fim, n) || (n > 0 && (!coluna || !colunas))) return -1;

  /* Ordena os índices (inserção: n é pequeno). */
  int32_t ordem[AGENDA_MAX_ITENS];
  for (size_t i = 0; i < n; i++) {
    int32_t atual = (int32_t)i;
    size_t j = i;
    while (j > 0 && vem_antes(ini, fim, atual, ordem[j - 1])) {
      ordem[j] = ordem[j - 1];
      j--;
    }
    ordem[j] = atual;
  }

  /* Percorre em grupos: um grupo termina quando o próximo começa depois de todos acabarem. */
  int32_t fim_da_coluna[AGENDA_MAX_ITENS];
  size_t inicio_grupo = 0;
  int32_t fim_grupo = 0;
  int32_t colunas_grupo = 0;

  for (size_t k = 0; k <= n; k++) {
    int fecha_grupo = k == n || (k > inicio_grupo && ini[ordem[k]] >= fim_grupo);
    if (fecha_grupo && k > inicio_grupo) {
      for (size_t m = inicio_grupo; m < k; m++) colunas[ordem[m]] = colunas_grupo;
      inicio_grupo = k;
      colunas_grupo = 0;
    }
    if (k == n) break;

    int32_t i = ordem[k];
    if (k == inicio_grupo) fim_grupo = fim[i];
    else if (fim[i] > fim_grupo) fim_grupo = fim[i];

    int32_t c = 0;
    while (c < colunas_grupo && fim_da_coluna[c] > ini[i]) c++;
    if (c == colunas_grupo) colunas_grupo++;
    fim_da_coluna[c] = fim[i];
    coluna[i] = c;
  }
  return 0;
}
