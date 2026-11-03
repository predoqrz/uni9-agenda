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
#include "dinheiro.h"

int main(void) {
  char linha[4096];
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
    } else {
      printf("erro 99\n");
    }
    fflush(stdout);
  }
  return 0;
}
