.PHONY: install build build-bin test lint clean release flake update-brew

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

release:
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
	$(MAKE) build-bin; \
	echo "Tagging $$TAG"; \
	git tag -a "$$TAG" -m "Release $$TAG"; \
	git push origin "$$TAG"; \
	echo "Publishing to npm"; \
	npm publish --access public

.PHONY: git-dirty
git-dirty:
	@git status --porcelain

flake:
	$(NIX) build .#

update-brew:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make update-brew VERSION=vX.Y.Z" >&2; exit 1; fi
	./scripts/update-brew.sh $(VERSION)
