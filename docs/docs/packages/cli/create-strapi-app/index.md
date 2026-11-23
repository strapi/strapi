---
title: 'create-strapi-app'
sidebar_label: 'create-strapi-app'
description: 'CLI to scaffold a new Strapi project'
package: 'create-strapi-app'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides the official CLI for Strapi app developers to create new Strapi projects. Available via `yarn create strapi-app` or `npx create-strapi-app`. Handles project initialization and prompts for configuration.

## Key concepts

- **Entry point**: `run()` function processes CLI arguments and guides project creation. See [index.ts](https://github.com/strapi/strapi/tree/develop/packages/cli/create-strapi-app).
- **Interactive prompts**: `prompts.ts` asks for the project directory, the language, the example app, git initialization, and dependency installation. `utils/database.ts` asks for the database. The CLI shows the prompts only when somebody can answer them. See [Prompt mode](#prompt-mode).
- **No Cloud login**: The CLI does not ask the user to log in to Strapi Cloud. It accepts `--skip-cloud` as a hidden flag that does nothing, so old scripts keep working.

## Prompt mode

`resolvePromptMode()` in `src/utils/invocation.ts` decides whether the CLI shows prompts. The CLI uses the first rule that matches:

1. `--non-interactive`: the CLI shows no prompts.
2. `--interactive`: the CLI does not switch to non-interactive mode, also in CI or without a terminal. Use it to pipe answers on stdin, as in older versions. Other flags still apply: `--quickstart` still skips the prompts, and a flag such as `--typescript` still answers its prompt.
3. A CI environment, which `ci-info` detects: the CLI shows no prompts, because nobody answers them.
4. No terminal on stdin or on stdout: the CLI shows no prompts.

If you use both flags, the CLI stops with an error. When rule 3 or 4 matches, the CLI logs the reason and runs as if you used `--non-interactive`. In this mode, you must give the project directory as an argument.

In non-interactive mode, the CLI uses your flags. For each option that you do not give, it uses the default value:

- SQLite as the database.
- TypeScript as the language, unless you pass `--template`.
- No example app.
- Install the dependencies.
- Initialize a git repository.

Rule 4 also matches when you pipe the output at a terminal. For example, `npx create-strapi my-app | tee log` runs without prompts, because stdout is not a terminal.

When you pass `--template`, the CLI does not add `typescript` or `@types/*` dependencies. The template's own `package.json` gives the TypeScript dependency versions. This is the same in interactive and non-interactive mode. Without `--template`, the CLI adds these dependencies only for a TypeScript project.

`detectInvocation()` and `resolvePromptMode()` read the same CI and terminal facts from `readEnvironment()`. The two results can still differ. For example, an agent that has a terminal gets `agent` and the prompts, and `--interactive` in CI gives `ci` and the prompts.

## Telemetry

The CLI sends project-creation events through `src/utils/usage.ts`. Each event carries `invocation` and `agentName` in `eventProperties`.

`src/utils/invocation.ts` sets these two values. `invocation` is one of `agent`, `ci`, `human`, or `unknown`. The CLI uses the first signal that matches:

1. The `--agent <name>` flag, or the `STRAPI_AGENT` environment variable. The flag wins. An empty value does not count.
2. Environment markers that coding agents set. The `@vercel/detect-agent` package reads them.
3. A CI environment, which the `ci-info` package detects, when no agent signal is present. An agent signal still wins in CI.
4. A terminal on both stdin and stdout means `human`. Without a terminal, the value is `unknown`, because a missing terminal alone does not prove that an agent ran the command.

`agentName` is `null` unless `invocation` is `agent`. The CLI never sends free text from the environment. It maps each name to a fixed list, and it sends `other` for a name that is not on the list. It sends `claude-code` for both `claude` and `claude-code`, and it ignores any version suffix, as in `claude-code_2-1-301_agent`.

If `STRAPI_TELEMETRY_DISABLED` is `1` or `true`, the CLI sends no events. The check is not case-sensitive. It uses the same values as `@strapi/core`. Before this check existed, create-strapi-app ignored this variable.

## Related

- [Testing](../../../contributing/03-testing/index.md): CLI test infrastructure.
