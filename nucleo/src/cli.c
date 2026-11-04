/*
 * CLI do núcleo, usada pelos testes cruzados em Python.
 * Lê uma operação por linha da entrada e responde uma linha:
 *   ler <texto>              -> ok <centavos>   | erro <codigo>
 *   formatar <centavos>      -> ok <texto>      | erro <codigo>
 *   repartir <total> <p1> .. -> ok <s1> <s2> .. | erro <codigo>
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "agenda.h"
#include "dinheiro.h"
#include "recorrencia.h"

int main(void) {
  char linha[4096];
  char *linha_resto;
  while (fgets(linha, sizeof linha, stdin)) {
    linha[strcspn(linha, "\r\n")] = '\0';
    if (strncmp(linha, "ler ", 4) == 0) {
      int64_t v;
      dinheiro_erro e = dinheiro_ler(linha + 4, &v);
      if (e) printf("erro %d\n", e); else printf("ok %lld\n", (long long)v);
    } else if (strncmp(linha, "formatar ", 9) == 0) {
      char buf[32];
      dinheiro_erro e = dinheiro_formatar(strtoll(linha + 9, NULL, 10), buf, sizeof buf);
      if (e) printf("erro %d\n", e); else printf("ok %s\n", buf);
    } else if (strncmp(linha, "repartir ", 9) == 0) {
      char *p = linha + 9;
      int64_t total = strtoll(p, &p, 10);
      int64_t pesos[64], saida[64];
      size_t n = 0;
      while (*p && n < 64) {
        char *depois;
        int64_t v = strtoll(p, &depois, 10);
        if (depois == p) break;
        pesos[n++] = v;
        p = depois;
      }
      dinheiro_erro e = dinheiro_repartir(total, pesos, n, saida);
      if (e) { printf("erro %d\n", e); }
      else {
        printf("ok");
        for (size_t i = 0; i < n; i++) printf(" %lld", (long long)saida[i]);
        printf("\n");
      }
    } else if (strncmp(linha, "colunas ", 8) == 0 || strncmp(linha, "conflitos ", 10) == 0) {
      /* colunas i1 f1 i2 f2 ...          -> ok c1/t1 c2/t2 ...
         conflitos ni nf i1 f1 i2 f2 ...  -> ok <índices> */
      int e_colunas = linha[2] == 'l';
      char *p = linha + (e_colunas ? 8 : 10);
      int32_t novo_ini = 0, novo_fim = 0;
      if (!e_colunas) {
        novo_ini = (int32_t)strtol(p, &p, 10);
        novo_fim = (int32_t)strtol(p, &p, 10);
      }
      int32_t ini[AGENDA_MAX_ITENS], fim[AGENDA_MAX_ITENS], a[AGENDA_MAX_ITENS], b[AGENDA_MAX_ITENS];
      size_t n = 0;
      while (*p && n < AGENDA_MAX_ITENS) {
        char *depois;
        long i = strtol(p, &depois, 10);
        if (depois == p) break;
        long f = strtol(depois, &p, 10);
        ini[n] = (int32_t)i;
        fim[n] = (int32_t)f;
        n++;
      }
      if (e_colunas) {
        if (agenda_colunas(ini, fim, n, a, b) != 0) { printf("erro 2\n"); }
        else {
          printf("ok");
          for (size_t i = 0; i < n; i++) printf(" %d/%d", (int)a[i], (int)b[i]);
          printf("\n");
        }
      } else {
        int total = agenda_conflitos(novo_ini, novo_fim, ini, fim, n, a);
        if (total < 0) { printf("erro 2\n"); }
        else {
          printf("ok");
          for (int i = 0; i < total; i++) printf(" %d", (int)a[i]);
          printf("\n");
        }
      }
    } else if (strncmp(linha, "vencimento ", 11) == 0) {
      /* vencimento <ano> <mes> <dia> -> ok <dia> (0 = inválido) */
      long a = strtol(linha + 11, &linha_resto, 10);
      long m = strtol(linha_resto, &linha_resto, 10);
      long d = strtol(linha_resto, NULL, 10);
      printf("ok %d\n", (int)recorrencia_dia_vencimento((int32_t)a, (int32_t)m, (int32_t)d));
    } else {
      printf("erro 99\n");
    }
    fflush(stdout);
  }
  return 0;
}
