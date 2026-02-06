# scute - AI Shell Assistant

## Purpose / Goal

`scute` is a CLI companion for your shell. It adds fast, context-aware command generation, suggestion, and explanation directly in your terminal workflow. The goal is to reduce friction when crafting commands by:

- Generating commands from natural language prompts
- Suggesting completions for partially typed commands
- Explaining commands without disrupting your prompt
- Integrating through lightweight keybindings and shell hooks

The name comes from the scute, the protective shell plate on a turtle, and the tool itself is meant to assist with shell commands.
Scute is built as a single native binary (via Bun) so it can be distributed and updated easily.

## Installation

Supported platforms: macOS and Linux (x86_64 only for now).

### A. Install via curl (install.sh)

Convenience installer (requires `curl` and `tar`):

```sh
curl -fsSL https://raw.githubusercontent.com/napisani/scute/main/scripts/install.sh | bash
```

By default it installs into `/usr/local/bin` and pulls the latest release. Pass `vX.Y.Z` and a custom directory to override.

### B. Homebrew

```sh
brew tap napisani/scute https://github.com/napisani/scute
brew install scute
```

### C. npm / npx

Install globally:

```sh
npm install -g @napisani/scute
```

Or run once with:

```sh
npx @napisani/scute --help
```

> The npm package runs a Bun-based `postinstall` script to download the matching release binary, so Bun must be available on your `PATH`.

### D. Nix

Add the repo as an input and use it in your Home Manager flake:

```nix
inputs.scute.url = "github:napisani/scute";

outputs = { self, nixpkgs, scute, ... }: {
  homeConfigurations.me = nixpkgs.lib.homeManagerConfiguration {
    # ...
    packages = [ scute.packages.${pkgs.system}.default ];
  };
};
```

> The repository ships an intentionally minimal `flake.nix`. Run `nix flake lock --update-input scute` inside your own workspace to pin exact revisions.

### E. Prebuilt binaries (manual)

Every Git tag publishes `x86_64` macOS and Linux archives on the [GitHub Releases](https://github.com/napisani/scute/releases) page. Download the archive for your platform, unpack it, and move the `scute` binary onto your `PATH`:

```sh
curl -L -o scute.tar.gz "https://github.com/napisani/scute/releases/download/vX.Y.Z/scute-vX.Y.Z-macos-x86_64.tar.gz"
tar -xzf scute.tar.gz
sudo mv scute /usr/local/bin/
```

Verify downloads with the checksums shipped alongside each release:

```sh
curl -LO https://github.com/napisani/scute/releases/download/vX.Y.Z/checksums.txt
grep scute-vX.Y.Z-macos-x86_64.tar.gz checksums.txt | shasum -a 256 -c -
```

### F. Install from source

```sh
git clone https://github.com/napisani/scute.git
cd scute
bun install --frozen-lockfile
bun run build:bin
sudo mv dist/scute /usr/local/bin/
```

If you prefer Make targets:

```sh
make build
sudo mv dist/scute /usr/local/bin/
```

## Configuration

Scute reads configuration from `~/.config/scute/config.yaml` by default. You can override it per invocation with `--config <path>`.

### Precedence

1. `--config <path>` (explicit CLI override)
2. Environment variables (provider keys, defaults)
3. Config file defaults (schema defaults)

Notes:
- `dotenv/config` is loaded at startup, so values in `.env` will be respected.
- Provider env vars (e.g., `OPENAI_API_KEY`) merge into `providers` and override matching entries.

### Minimal config example

```yaml
# ~/.config/scute/config.yaml

# Use a compact view for the token editor
viewMode: horizontal

# Define at least one provider for prompts
providers:
  - name: openai
    apiKey: ${OPENAI_API_KEY}

# Optional: adjust shell keybindings (universal syntax)
shellKeybindings:
  explain: "Ctrl+E"
  build: "Ctrl+G"
  suggest: "Ctrl+Shift+E"
```

### Fully configured example

```yaml
# ~/.config/scute/config.yaml

# Layout for the interactive token editor
viewMode: horizontal # horizontal -> annotated view, vertical -> list view

# Clipboard command for output channel "clipboard"
clipboardCommand: "pbcopy"

# Providers used by prompts (env vars override these)
providers:
  - name: openai
    apiKey: ${OPENAI_API_KEY}
  - name: anthropic
    apiKey: ${ANTHROPIC_API_KEY}
  - name: gemini
    apiKey: ${GEMINI_API_KEY}
  - name: ollama
    baseUrl: ${OLLAMA_BASE_URL}

# Keybindings for the interactive token editor UI
keybindings:
  up: ["up"]
  down: ["down"]
  left: ["left", "h"]
  right: ["right", "l"]
  wordForward: ["w"]
  wordBackward: ["b"]
  lineStart: ["0", "^"]
  lineEnd: ["$"]
  firstToken: ["g"]
  lastToken: ["G"]
  appendLine: ["A"]
  explain: ["e"]
  toggleView: ["m"]
  insert: ["i"]
  append: ["a"]
  change: ["c"]
  exitInsert: ["escape"]
  save: ["return"]

# Shell keybindings in universal syntax (rendered by scute init)
shellKeybindings:
  explain: "Ctrl+E"
  build: "Ctrl+G"
  suggest: "Ctrl+Shift+E"
  generate: [] # disable if you do not want a binding

# Theme colors (catppuccin defaults shown)
theme:
  tokenColors:
    command: "#A6E3A1"
    option: "#FAB387"
    argument: "#89B4FA"
    assignment: "#CBA6F7"
    pipe: "#94E2D5"
    controlOperator: "#F38BA8"
    redirect: "#CDD6F4"
    unknown: "#6C7086"
  tokenDescription: "#CDD6F4"
  markerColor: "#CDD6F4"

# Prompt behavior per command
prompts:
  explain:
    provider: openai
    model: gpt-4
    temperature: 0.7
    maxTokens: 128000
    userPrompt: ""
    systemPromptOverride: ""
  suggest:
    provider: openai
    model: gpt-4
    temperature: 0.7
    maxTokens: 128000
  generate:
    provider: openai
    model: gpt-4
    temperature: 0.7
    maxTokens: 128000
  describeTokens:
    provider: openai
    model: gpt-4
    temperature: 0.7
    maxTokens: 128000
```

### Environment variables

Provider credentials and defaults:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `OLLAMA_BASE_URL`
- `SCUTE_DEFAULT_PROVIDER`
- `SCUTE_DEFAULT_MODEL`

Runtime behavior:

- `SCUTE_DEBUG` (set to `1` or `true` for verbose logging)
- `SCUTE_SHELL` (override detected shell name)
- `SHELL` (standard shell env var)
- `READLINE_LINE` (readline current line, when present)

## Shell Integration

`scute` integrates with your shell via a script that needs to be loaded by your shell's configuration file (e.g., `.bashrc`).

### For Bash

Add the following line to the end of your `~/.bashrc` file:

```sh
eval "$(scute init bash)"
```

After adding the line, restart your terminal or run `source ~/.bashrc` to apply the changes.

### For Nix/home-manager Users

If you use `home-manager` to manage your dotfiles, you cannot edit `.bashrc` directly. Instead, add the following to your `home.nix` configuration:

```nix
programs.bash = {
  enable = true;
  bashrcExtra = ''
    eval "$(scute init bash)"
  '';
};
```

Then, run `home-manager switch` to apply the configuration.

## Debug Logging

Set `SCUTE_DEBUG=1` to enable verbose logs. When enabled, `scute` writes detailed traces to `/tmp/scute.log`:

```sh
export SCUTE_DEBUG=1
tail -f /tmp/scute.log
```

### Inspect Resolved Configuration

Use the `config-debug` subcommand to print the fully resolved configuration (including environment overrides). This is useful when troubleshooting provider settings or custom config files:

```sh
scute --config configs/ollama-config.yml config-debug
```

The command prints a JSON payload containing the merged configuration and relevant environment variables.

## Testing

Test files use the `.test.ts` suffix. Evaluation tests use `.eval.test.ts` and live in the `evals/` directory.

```sh
# Run standard unit tests
bun run test

# Run evaluation tests
bun run evals

# Or via Make targets
make test
```

## Usage

Once installed and configured, you can use the following keyboard shortcuts in your terminal:

- **`Ctrl + G`**: **Suggest Completion**. Takes the current command you are typing, sends it to the AI for completion, and replaces the line with the AI's suggestion.
- **`Ctrl + P`**: **Suggest from Prompt**. Replaces your current line with a command generated by the AI based on a prompt. (Note: The current implementation is a stub).
- **`Ctrl + E`**: **Explain Command**. Reads the command on the current line and displays a helpful, non-interfering explanation on the line below your prompt.

## Release Process (Maintainers)

1. Update `package.json` version.
2. Ensure your working tree is clean and Bun is installed.
3. Run `make release`.
   - Runs lint and tests, builds the binary, tags `vX.Y.Z`, pushes the tag, and publishes to npm.
4. GitHub Actions builds macOS/Linux archives and uploads them to the release.
5. Refresh Homebrew checksums:

```sh
make update-brew VERSION=vX.Y.Z
```
