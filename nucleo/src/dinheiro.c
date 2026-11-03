#include "dinheiro.h"

/* Sem libc: este arquivo também é compilado para WebAssembly puro. */

#define REPARTIR_MAX_ITENS 64

static int e_digito(char c) { return c >= '0' && c <= '9'; }
static int e_espaco(char c) { return c == ' ' || c == '\t' || c == '\n' || c == '\r'; }

dinheiro_erro dinheiro_ler(const char *texto, int64_t *centavos) {
  if (!texto) return DINHEIRO_VAZIO;

  /* Corta espaços em volta e o prefixo "R$". */
  const char *ini = texto;
  while (e_espaco(*ini)) ini++;
  if (ini[0] == 'R' && ini[1] == '$') {
    ini += 2;
    while (e_espaco(*ini)) ini++;
  }
  const char *fim = ini;
  while (*fim) fim++;
  while (fim > ini && e_espaco(fim[-1])) fim--;
  if (fim == ini) return DINHEIRO_VAZIO;

  /* Acha a vírgula (no máximo uma) e conta os pontos. */
  const char *virgula = 0;
  const char *ultimo_ponto = 0;
  int pontos = 0;
  for (const char *p = ini; p < fim; p++) {
    if (*p == ',') {
      if (virgula) return DINHEIRO_INVALIDO;
      virgula = p;
    } else if (*p == '.') {
      pontos++;
      ultimo_ponto = p;
    } else if (!e_digito(*p)) {
      return DINHEIRO_INVALIDO;
    }
  }

  /* Decide onde termina a parte inteira. */
  const char *fim_inteiro = fim;
  const char *decimal = 0;
  if (virgula) {
    if (ultimo_ponto && ultimo_ponto > virgula) return DINHEIRO_INVALIDO;
    fim_inteiro = virgula;
    decimal = virgula + 1;
  } else if (pontos == 1 && (fim - ultimo_ponto - 1) >= 1 && (fim - ultimo_ponto - 1) <= 2) {
    fim_inteiro = ultimo_ponto;
    decimal = ultimo_ponto + 1;
  }

  /* Parte inteira: dígitos, com pontos de milhar em grupos de 3 se houver. */
  int64_t reais = 0;
  int digitos_inteiros = 0;
  int desde_ponto = -1; /* -1 = ainda não viu ponto de milhar */
  int primeiro_grupo = 0;
  for (const char *p = ini; p < fim_inteiro; p++) {
    if (*p == '.') {
      if (desde_ponto == -1) {
        if (primeiro_grupo < 1 || primeiro_grupo > 3) return DINHEIRO_INVALIDO;
      } else if (desde_ponto != 3) {
        return DINHEIRO_INVALIDO;
      }
      desde_ponto = 0;
      continue;
    }
    if (desde_ponto == -1) primeiro_grupo++;
    else desde_ponto++;
    digitos_inteiros++;
    reais = reais * 10 + (*p - '0');
    if (reais > DINHEIRO_MAXIMO / 100) return DINHEIRO_GRANDE;
  }
  if (desde_ponto != -1 && desde_ponto != 3) return DINHEIRO_INVALIDO;

  /* Parte decimal: 0, 1 ou 2 dígitos ("120," vale como 120,00). */
  int64_t frac = 0;
  if (decimal) {
    int n = (int)(fim - decimal);
    if (n > 2) return DINHEIRO_INVALIDO;
    for (int i = 0; i < n; i++) frac = frac * 10 + (decimal[i] - '0');
    if (n == 1) frac *= 10;
    if (digitos_inteiros == 0 && n == 0) return DINHEIRO_INVALIDO;
  } else if (digitos_inteiros == 0) {
    return DINHEIRO_INVALIDO;
  }

  int64_t total = reais * 100 + frac;
  if (total > DINHEIRO_MAXIMO) return DINHEIRO_GRANDE;
  *centavos = total;
  return DINHEIRO_OK;
}

dinheiro_erro dinheiro_formatar(int64_t centavos, char *buf, size_t tam) {
  /* Monta de trás para frente num rascunho e copia. */
  char rascunho[32];
  int i = (int)sizeof rascunho;
  rascunho[--i] = '\0';

  int negativo = centavos < 0;
  /* Trabalha com o valor negativo para INT64_MIN não estourar. */
  int64_t v = negativo ? centavos : -centavos;

  int64_t frac = -(v % 100);
  v /= 100;
  rascunho[--i] = (char)('0' + frac % 10);
  rascunho[--i] = (char)('0' + frac / 10);
  rascunho[--i] = ',';

  int grupo = 0;
  do {
    if (grupo == 3) {
      rascunho[--i] = '.';
      grupo = 0;
    }
    rascunho[--i] = (char)('0' - v % 10);
    v /= 10;
    grupo++;
  } while (v != 0);

  rascunho[--i] = ' ';
  rascunho[--i] = '$';
  rascunho[--i] = 'R';
  if (negativo) rascunho[--i] = '-';

  size_t precisa = sizeof rascunho - (size_t)i;
  if (!buf || tam < precisa) return DINHEIRO_ESPACO;
  for (size_t k = 0; k < precisa; k++) buf[k] = rascunho[i + (int)k];
  return DINHEIRO_OK;
}

/* a * b / c exato em 128 bits emulados (a, b, c >= 0, c > 0); devolve o resto em *resto. */
static uint64_t mul_div(uint64_t a, uint64_t b, uint64_t c, uint64_t *resto) {
  uint64_t a_lo = a & 0xffffffffu, a_hi = a >> 32;
  uint64_t b_lo = b & 0xffffffffu, b_hi = b >> 32;
  uint64_t ll = a_lo * b_lo, lh = a_lo * b_hi, hl = a_hi * b_lo, hh = a_hi * b_hi;
  uint64_t meio = (ll >> 32) + (lh & 0xffffffffu) + (hl & 0xffffffffu);
  uint64_t lo = (meio << 32) | (ll & 0xffffffffu);
  uint64_t hi = hh + (lh >> 32) + (hl >> 32) + (meio >> 32);

  uint64_t q = 0, r = 0;
  for (int bit = 127; bit >= 0; bit--) {
    uint64_t prox = bit >= 64 ? (hi >> (bit - 64)) & 1 : (lo >> bit) & 1;
    /* r < c <= 2^63, então r*2+1 cabe em 64 bits */
    r = (r << 1) | prox;
    if (r >= c) {
      r -= c;
      if (bit < 64) q |= (uint64_t)1 << bit;
    }
  }
  *resto = r;
  return q;
}

dinheiro_erro dinheiro_repartir(int64_t total, const int64_t *pesos, size_t n, int64_t *saida) {
  if (total < 0 || total > DINHEIRO_MAXIMO) return DINHEIRO_INVALIDO;
  if (n == 0) return total == 0 ? DINHEIRO_OK : DINHEIRO_INVALIDO;
  if (n > REPARTIR_MAX_ITENS || !pesos || !saida) return DINHEIRO_INVALIDO;

  uint64_t soma = 0;
  for (size_t i = 0; i < n; i++) {
    if (pesos[i] < 0 || pesos[i] > DINHEIRO_MAXIMO) return DINHEIRO_INVALIDO;
    soma += (uint64_t)pesos[i];
  }

  uint64_t restos[REPARTIR_MAX_ITENS];
  int64_t distribuido = 0;
  for (size_t i = 0; i < n; i++) {
    uint64_t peso = soma == 0 ? 1 : (uint64_t)pesos[i];
    uint64_t divisor = soma == 0 ? (uint64_t)n : soma;
    saida[i] = (int64_t)mul_div((uint64_t)total, peso, divisor, &restos[i]);
    distribuido += saida[i];
  }

  /* Cada centavo que sobrou vai para o maior resto ainda não premiado. */
  int premiado[REPARTIR_MAX_ITENS] = {0};
  for (int64_t sobra = total - distribuido; sobra > 0; sobra--) {
    size_t melhor = n;
    for (size_t i = 0; i < n; i++) {
      if (premiado[i]) continue;
      if (melhor == n || restos[i] > restos[melhor] ||
          (restos[i] == restos[melhor] && pesos[i] > pesos[melhor])) {
        melhor = i;
      }
    }
    premiado[melhor] = 1;
    saida[melhor]++;
  }
  return DINHEIRO_OK;
}
