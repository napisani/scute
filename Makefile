.PHONY: install build build-bin test lint clean release flake

BUN ?= bun
NIX ?= nix

install:
	$(BUN) install --frozen-lockfile

build: clean install build-bin

build-bin:
	$(BUN) run build:bin

test: install
	$(BUN) run test

lint: install
	$(BUN) run lint

clean:
	rm -rf dist

release: build test
	@echo "Release artifacts ready in dist/"

flake:
	$(NIX) build .#
