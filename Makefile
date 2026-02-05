SCUTE_BIN=./scute
CONFIG_DIR=configs

.PHONY: build clean run-example-ollama run-example-openai run-example-anthropic run-example-gemini terminal-mcp test

build: clean $(SCUTE_BIN)

clean:
	rm -f $(SCUTE_BIN)

$(SCUTE_BIN):
	bun run build

run-example-ollama: build
	READLINE_LINE="docker ps --format 'table {{.Names}}\t{{.Status}}'" $(SCUTE_BIN) --config $(CONFIG_DIR)/ollama-config.yml build

run-example-openai: build
	READLINE_LINE="git status -sb" $(SCUTE_BIN) --config $(CONFIG_DIR)/openai-config.yml build

run-example-anthropic: build
	READLINE_LINE="docker ps --format 'table {{.Names}}\t{{.Status}}'" $(SCUTE_BIN) --config $(CONFIG_DIR)/anthropic-config.yml build

run-example-gemini: build
	READLINE_LINE='grep -R "TODO" src' $(SCUTE_BIN) --config $(CONFIG_DIR)/gemini-config.yml build

terminal-mcp:
	terminal-mcp --socket /tmp/terminal-mcp.sock --cols 100 --rows 30 --shell /bin/bash

test: 
	bun run test
