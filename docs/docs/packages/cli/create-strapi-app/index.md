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

## Admin user

Every installation that installs the dependencies creates one Super Admin user. The step is mandatory. The CLI has no option to skip it. The code is in `src/utils/admin-user.ts`.

The CLI asks for the email and the password together with the other prompts, before the dependency install. It asks for the password twice and applies the same rules as `strapi admin:create-user`: 8 characters minimum, 72 bytes maximum, one lowercase, one uppercase, one number. It does not ask for a name. It sends the first name `Admin`.

Each value comes from the first source that has it:

| Value    | 1. Explicit input                                       | 2. Prompt | 3. Without prompts          |
| -------- | ------------------------------------------------------- | --------- | --------------------------- |
| Email    | `--admin-email <email>`                                 | Yes       | `admin@example.com`         |
| Password | `CREATE_STRAPI_APP_ADMIN_PASSWORD` environment variable | Yes       | A generated random password |

The CLI prompts if `--non-interactive` is absent and stdin is a TTY. `--quickstart` still prompts. Without prompts, the CLI uses `admin@example.com` if the email is missing. If the password is missing, the CLI generates one. The CLI has no default password.

The CLI has no password flag, because a flag value goes into shell history and the process list. The environment variable does not start with `STRAPI_ADMIN_`, because Vite exposes those variables to the admin bundle. At startup, the CLI reads the variable and removes it from `process.env`. The dependency install, its lifecycle scripts, the seed, and `develop` never see it.

After the dependency install and the seed, the CLI runs `strapi admin:create-user --email <email> --firstname Admin` in the new project. It passes the password through the `STRAPI_CLI_ADMIN_PASSWORD` environment variable of that child process, never through its arguments. `admin:create-user` reads that variable only when it does not prompt. The name is duplicated in both packages, and the `admin:create-user` unit tests pin it.

The generated password has 24 characters from `a-z`, `A-Z`, and `0-9`, with at least one of each class. The CLI picks each character with `crypto.randomInt`. The password passes the same strength rules as a typed password. The CLI shows the email and the generated password once, in the summary at the end of the installation. It does not store the password and does not show it again. The CLI shows the summary only if `admin:create-user` succeeded.

Templates can pin an older `@strapi/strapi`. The CLI searches the `admin:create-user --help` output for `STRAPI_CLI_ADMIN_PASSWORD`. If the name is absent, the admin step fails.

If the admin step fails, for example because the database server is down, the CLI keeps the project. It prints the error and `<package manager> run strapi admin:create-user`, does not start the app, and exits with code 1.

With `--no-install`, the CLI cannot run the command. It skips the admin step and adds the command to the "To get started" text. If `--admin-email` is set, the CLI prints a warning that the flag is ignored. The programmatic `createStrapi(scope)` export, used by `tests/helpers/test-app.js`, creates no admin user.

The CLI sends `willCreateAdminUser`, `didCreateAdminUser`, and `didNotCreateAdminUser` events. Each event carries `passwordGenerated` and nothing else about the admin user. The events never carry the email or the password.

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
