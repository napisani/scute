BRASH_BIN=./brash
CONFIG_DIR=configs

.PHONY: build clean run-example-ollama run-example-openai run-example-anthropic run-example-gemini

build: clean $(BRASH_BIN)

clean:
	rm -f $(BRASH_BIN)

$(BRASH_BIN):
	bun run build

run-example-ollama: build
	READLINE_LINE="docker ps --format 'table {{.Names}}\t{{.Status}}'" $(BRASH_BIN) --config $(CONFIG_DIR)/ollama-config.yml build

run-example-openai: build
	READLINE_LINE="git status -sb" $(BRASH_BIN) --config $(CONFIG_DIR)/openai-config.yml build

run-example-anthropic: build
	READLINE_LINE="docker ps --format 'table {{.Names}}\t{{.Status}}'" $(BRASH_BIN) --config $(CONFIG_DIR)/anthropic-config.yml build

run-example-gemini: build
	READLINE_LINE='grep -R "TODO" src' $(BRASH_BIN) --config $(CONFIG_DIR)/gemini-config.yml build
