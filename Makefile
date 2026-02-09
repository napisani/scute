.PHONY: install build test test-unit test-coverage test-evals test-pty test-pty-one lint clean release release-create release-publish flake update-brew update-brew-latest

BUN ?= bun
NIX ?= nix
SCUTE_BIN ?= dist/scute
CONFIG_DIR ?= configs

install:
	$(BUN) install --frozen-lockfile

build: clean install
	$(BUN) run build:bin
	chmod +x dist/scute

# Run all tests (unit + evals)
test: install
	$(BUN) run test

# Unit tests only
test-unit: install
	$(BUN) run test:unit

# Unit tests with coverage
test-coverage: install
	$(BUN) run test:coverage

# Evaluation tests (require API credentials)
test-evals: install
	$(BUN) run test:evals

# PTY E2E tests (require python3 and API credentials)
test-pty:
	scripts/agent/run-all

# Run single PTY scenario (usage: make test-pty-one SCENARIO=suggest-stdout)
test-pty-one:
	@if [ -z "$(SCENARIO)" ]; then \
		echo "Usage: make test-pty-one SCENARIO=<scenario-name>"; \
		echo "Available scenarios:"; \
		ls -1 scripts/agent/scenarios/*.json | xargs -n1 basename -s .json; \
		exit 1; \
	fi
	scripts/agent/run-one $(SCENARIO)

lint: install
	$(BUN) run lint

clean:
	rm -rf dist

release-create:
	@set -euo pipefail; \
	VERSION=$$($(BUN) --print "const pkg = await Bun.file('./package.json').json(); pkg.version"); \
	if [ "$$VERSION" = "0.0.0-development" ]; then \
		echo "Version in package.json is set to '$$VERSION'. Update it before releasing." >&2; \
		exit 1; \
	fi; \
	TAG="v$$VERSION"; \
	if git rev-parse "$$TAG" >/dev/null 2>&1; then \
		echo "Tag $$TAG already exists. Bump the version before releasing." >&2; \
		exit 1; \
	fi; \
	if [ -n "$$(${MAKE} --silent git-dirty)" ]; then \
		echo "Working tree is dirty. Commit or stash changes before releasing." >&2; \
		exit 1; \
	fi; \
	echo "Preparing release $$TAG"; \
	$(MAKE) clean; \
	$(MAKE) install; \
	$(MAKE) lint; \
	$(MAKE) test; \
	echo "Tagging $$TAG"; \
	git tag -a "$$TAG" -m "Release $$TAG"; \
	git push origin "$$TAG"

release-publish:
	@set -euo pipefail; \
	VERSION=$$($(BUN) --print "const pkg = await Bun.file('./package.json').json(); pkg.version"); \
	if [ "$$VERSION" = "0.0.0-development" ]; then \
		echo "Version in package.json is set to '$$VERSION'. Update it before releasing." >&2; \
		exit 1; \
	fi; \
	TAG="v$$VERSION"; \
	if ! git rev-parse "$$TAG" >/dev/null 2>&1; then \
		echo "Tag $$TAG does not exist. Run 'make release-create' first." >&2; \
		exit 1; \
	fi; \
	if [ -n "$$(${MAKE} --silent git-dirty)" ]; then \
		echo "Working tree is dirty. Commit or stash changes before publishing." >&2; \
		exit 1; \
	fi; \
	echo "Publishing to npm"; \
	npm publish --access public

release: release-create release-publish

.PHONY: git-dirty
git-dirty:
	@git status --porcelain

flake:
	$(NIX) build .#

update-brew:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make update-brew VERSION=vX.Y.Z" >&2; exit 1; fi
	$(BUN) scripts/update-brew.ts $(VERSION)

update-brew-latest:
	@set -euo pipefail; \
	LATEST_TAG=$$(git tag --sort=-v:refname | head -n1); \
	if [ -z "$$LATEST_TAG" ]; then \
		echo "No git tags found. Run 'make release-create' first." >&2; \
		exit 1; \
	fi; \
	echo "Updating Homebrew formula for $$LATEST_TAG"; \
	$(MAKE) update-brew VERSION=$$LATEST_TAG

run-example-ollama: install
	READLINE_LINE="docker ps --format 'table {{.Names}}\t{{.Status}}'" $(SCUTE_BIN) --config $(CONFIG_DIR)/ollama-config.yml build

run-example-openai: install
	READLINE_LINE="git status -sb" $(SCUTE_BIN) --config $(CONFIG_DIR)/openai-config.yml build

run-example-anthropic: install
	READLINE_LINE="docker ps --format 'table {{.Names}}\t{{.Status}}'" $(SCUTE_BIN) --config $(CONFIG_DIR)/anthropic-config.yml build

run-example-gemini: install
	READLINE_LINE='grep -R "TODO" src' $(SCUTE_BIN) --config $(CONFIG_DIR)/gemini-config.yml build
