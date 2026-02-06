# AGENTS

Use function declarations (`function foo() {}`) for top-level definitions.
Reason: clearer stack traces (stable function names after build/minify).

Place high-level, command-rendered UI in `src/pages` and reusable UI building blocks in `src/components`.

Hooks: use a single options object with named parameters (no positional args).

Colors: all colors should be defined as part of the thme in the `src/config` module. Default colors should be selected using the catppuccin palette.

Environment variables: All env vars should be defined in the `src/environment` module and accesses exclusively via the `src/config` module. 
All down stream code should use the config directly, and allow the config module to handle overrides, precedence, and defaults. 

