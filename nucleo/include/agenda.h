/* Regras de horário da agenda. Tempos em minutos inteiros (ex.: minutos desde 1970). */
#ifndef BPQ_AGENDA_H
#define BPQ_AGENDA_H

#include <stddef.h>
#include <stdint.h>

#define AGENDA_MAX_ITENS 128

/* 1 se [a_ini, a_fim) e [b_ini, b_fim) se cruzam. Só encostar (um termina 10:00, outro começa 10:00) não é encaixe. */
int agenda_sobrepoe(int32_t a_ini, int32_t a_fim, int32_t b_ini, int32_t b_fim);

/*
 * Quais dos n horários existentes cruzam o novo [novo_ini, novo_fim).
 * Grava os índices em `saida` (na ordem de entrada) e devolve quantos são.
 * Devolve -1 se n > AGENDA_MAX_ITENS ou se algum intervalo tiver fim <= início.
 */
int agenda_conflitos(int32_t novo_ini, int32_t novo_fim, const int32_t *ini, const int32_t *fim, size_t n,
                     int32_t *saida);

/*
 * Arruma encaixes lado a lado para a visão do dia.
 * Para cada atendimento i grava coluna[i] (0, 1, 2…) e colunas[i] = quantas colunas
 * o grupo de horários encadeados com ele usa. Quem não cruza com ninguém fica na
 * coluna 0 de 1. Na ordem de início (empate: o mais longo primeiro), cada um pega a
 * primeira coluna livre.
 * Devolve 0, ou -1 se n > AGENDA_MAX_ITENS ou se algum intervalo tiver fim <= início.
 */
int agenda_colunas(const int32_t *ini, const int32_t *fim, size_t n, int32_t *coluna, int32_t *colunas);

#endif
