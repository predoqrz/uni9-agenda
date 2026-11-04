# Núcleo C do UNI9-AGENDA.
#   make        -> CLI nativa em bin/ (usada pelos testes cruzados em Python)
#   make test   -> testes em C com AddressSanitizer e UBSan
#   make wasm   -> ../src/lib/nucleo/nucleo.wasm + carimbo de versão
CC ?= clang
WASM_CC ?= clang
CFLAGS = -std=c11 -Wall -Wextra -Werror -pedantic -Iinclude
FONTES = src/dinheiro.c src/agenda.c src/recorrencia.c
CABECALHOS = include/dinheiro.h include/agenda.h include/recorrencia.h
EXE = $(if $(filter Windows_NT,$(OS)),.exe,)
DESTINO_WASM = ../src/lib/nucleo/nucleo.wasm
# Biblioteca compartilhada para o Python (ctypes)
LIB = $(if $(filter Windows_NT,$(OS)),bin/uni9.dll,bin/libuni9.so)

.PHONY: all test wasm lib clean

all: bin/uni9$(EXE) $(LIB)

bin/uni9$(EXE): $(FONTES) src/cli.c $(CABECALHOS)
	@mkdir -p bin
	$(CC) $(CFLAGS) -O2 $(FONTES) src/cli.c -o $@

bin/teste_dinheiro$(EXE): $(FONTES) testes/teste_dinheiro.c $(CABECALHOS)
	@mkdir -p bin
	$(CC) $(CFLAGS) -g -fsanitize=address,undefined -fno-sanitize-recover=all $(FONTES) testes/teste_dinheiro.c -o $@

bin/teste_agenda$(EXE): $(FONTES) testes/teste_agenda.c $(CABECALHOS)
	@mkdir -p bin
	$(CC) $(CFLAGS) -g -fsanitize=address,undefined -fno-sanitize-recover=all $(FONTES) testes/teste_agenda.c -o $@

bin/teste_recorrencia$(EXE): $(FONTES) testes/teste_recorrencia.c $(CABECALHOS)
	@mkdir -p bin
	$(CC) $(CFLAGS) -g -fsanitize=address,undefined -fno-sanitize-recover=all $(FONTES) testes/teste_recorrencia.c -o $@

test: bin/teste_dinheiro$(EXE) bin/teste_agenda$(EXE) bin/teste_recorrencia$(EXE)
	./bin/teste_dinheiro$(EXE)
	./bin/teste_agenda$(EXE)
	./bin/teste_recorrencia$(EXE)

wasm: $(FONTES) src/wasm.c $(CABECALHOS)
	@mkdir -p $(dir $(DESTINO_WASM))
	"$(WASM_CC)" --target=wasm32 -nostdlib -fno-builtin -O2 $(CFLAGS) -Wl,--no-entry -Wl,--strip-all $(FONTES) src/wasm.c -o $(DESTINO_WASM)
	node ../scripts/carimbo-nucleo.mjs gravar

clean:
	rm -rf bin

lib: $(LIB)
$(LIB): $(FONTES) $(CABECALHOS)
	@mkdir -p bin
	$(CC) $(CFLAGS) -O2 -shared -fPIC $(FONTES) -o $@
