/* Contas fixas: em que dia do mês a conta cai. */
#ifndef BPQ_RECORRENCIA_H
#define BPQ_RECORRENCIA_H

#include <stdint.h>

/* 1 se o ano é bissexto (calendário gregoriano). */
int recorrencia_bissexto(int32_t ano);

/* Quantos dias tem o mês (1–12) do ano. Devolve 0 se o mês for inválido. */
int32_t recorrencia_dias_no_mes(int32_t ano, int32_t mes);

/*
 * Dia em que a conta de "todo dia `dia`" cai no mês: dia 31 vira o último dia
 * nos meses curtos (30, 29 ou 28). Devolve 0 se dia não estiver entre 1 e 31
 * ou se o mês for inválido.
 */
int32_t recorrencia_dia_vencimento(int32_t ano, int32_t mes, int32_t dia);

#endif
