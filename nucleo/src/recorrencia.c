#include "recorrencia.h"

int recorrencia_bissexto(int32_t ano) {
  return (ano % 4 == 0 && ano % 100 != 0) || ano % 400 == 0;
}

int32_t recorrencia_dias_no_mes(int32_t ano, int32_t mes) {
  static const int32_t dias[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  if (mes < 1 || mes > 12) return 0;
  if (mes == 2 && recorrencia_bissexto(ano)) return 29;
  return dias[mes - 1];
}

int32_t recorrencia_dia_vencimento(int32_t ano, int32_t mes, int32_t dia) {
  int32_t ultimo = recorrencia_dias_no_mes(ano, mes);
  if (ultimo == 0 || dia < 1 || dia > 31) return 0;
  return dia < ultimo ? dia : ultimo;
}
