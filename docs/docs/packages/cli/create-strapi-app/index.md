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

Provides the official CLI for Strapi app developers to create new Strapi projects. Available via `yarn create strapi-app` or `npx create-strapi-app`. Handles project initialization, prompts for configuration, and can integrate with Strapi Cloud.

## Key concepts

- **Entry point**: `run()` function processes CLI arguments and guides project creation. See [index.ts](https://github.com/strapi/strapi/tree/develop/packages/cli/create-strapi-app).
- **Interactive prompts**: Collects project name, database choice, and optional Cloud integration via `prompts.ts`.
- **Dual mode**: Supports local project creation and Strapi Cloud project creation with API integration.

## Telemetry

The CLI sends project-creation events through `src/utils/usage.ts`. Each event carries `invocation` and `agentName` in `eventProperties`.

`src/utils/invocation.ts` sets these two values. `invocation` is one of `agent`, `ci`, `human`, or `unknown`. The CLI uses the first signal that matches:

1. The `--agent <name>` flag, or the `STRAPI_AGENT` environment variable. The flag wins. An empty value does not count.
2. Environment markers that coding agents set. The `@vercel/detect-agent` package reads them.
3. A CI environment, which the `ci-info` package detects. A CI run is not counted as an agent.
4. A terminal on both stdin and stdout means `human`. Without a terminal, the value is `unknown`, because a missing terminal alone does not prove that an agent ran the command.

`agentName` is `null` unless `invocation` is `agent`. The CLI never sends free text from the environment. It maps each name to a fixed list, and it sends `other` for a name that is not on the list. It sends `claude-code` for both `claude` and `claude-code`, and it ignores any version suffix, as in `claude-code_2-1-301_agent`.

If `STRAPI_TELEMETRY_DISABLED` is `1` or `true`, the CLI sends no events. The check is not case-sensitive. It uses the same values as `@strapi/core`. Before this check existed, create-strapi-app ignored this variable.

## Related

- [Testing](../../../contributing/03-testing/index.md): CLI test infrastructure.
