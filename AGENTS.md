# AGENTS

Use function declarations (`function foo() {}`) for top-level definitions.
Reason: clearer stack traces (stable function names after build/minify).

Place high-level, command-rendered UI in `src/pages` and reusable UI building blocks in `src/components`.

Hooks: use a single options object with named parameters (no positional args).
