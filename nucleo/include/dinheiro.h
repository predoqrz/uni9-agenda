/* Regras de dinheiro do UNI9-AGENDA: tudo em centavos inteiros, nunca float. */
#ifndef UNI9_DINHEIRO_H
#define UNI9_DINHEIRO_H

#include <stddef.h>
#include <stdint.h>

/* Maior valor aceito: R$ 10 bilhões. Acima disso é erro de digitação. */
#define DINHEIRO_MAXIMO INT64_C(1000000000000)

typedef enum {
  DINHEIRO_OK = 0,
  DINHEIRO_VAZIO = 1,       /* nada digitado */
  DINHEIRO_INVALIDO = 2,    /* letra, sinal, separador fora do lugar */
  DINHEIRO_GRANDE = 3,      /* passou de DINHEIRO_MAXIMO */
  DINHEIRO_ESPACO = 4       /* buffer de saída pequeno demais */
} dinheiro_erro;

/*
 * Lê o que a pessoa digitou e devolve centavos.
 * Aceita "120", "120,5", "120,50", "1.234,56", "120.50" (teclado com ponto),
 * ",50", espaços em volta e o prefixo "R$".
 * Com vírgula: vírgula é decimal e pontos separam milhar (grupos de 3).
 * Sem vírgula: um único ponto seguido de 1 ou 2 dígitos é decimal;
 * fora isso, pontos separam milhar ("1.234" = R$ 1.234,00).
 * Negativos não são aceitos: desconto e saída já dizem o sentido.
 * Em erro, *centavos não é alterado.
 */
dinheiro_erro dinheiro_ler(const char *texto, int64_t *centavos);

/*
 * Escreve "R$ 1.234,56" (ou "-R$ 1,00") em buf, com '\0' no fim.
 * Precisa de no máximo 24 bytes. Devolve DINHEIRO_ESPACO se tam for pouco.
 */
dinheiro_erro dinheiro_formatar(int64_t centavos, char *buf, size_t tam);

/*
 * Reparte `total` (ex.: o desconto) entre n itens proporcionalmente a `pesos`
 * (ex.: o valor de cada procedimento). A soma de `saida` é exatamente `total`:
 * os centavos que sobram do arredondamento vão para os itens de maior resto,
 * e no empate para o de maior peso, depois para o primeiro.
 * Pesos negativos são inválidos; se todos forem zero, reparte por igual.
 * n = 0 só é válido com total = 0. Usa no máximo 64 itens.
 */
dinheiro_erro dinheiro_repartir(int64_t total, const int64_t *pesos, size_t n, int64_t *saida);

#endif
