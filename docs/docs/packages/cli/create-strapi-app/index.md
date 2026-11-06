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

Every installation that installs the dependencies creates one Super Admin user and one admin token for that user. The step is mandatory. The CLI has no option to skip it. The code is in `src/utils/admin-user.ts`.

The CLI asks for the email and the password together with the other prompts, before the dependency install. It asks for the password twice and applies the same rules as `strapi admin:create-user`: 8 characters minimum, 72 bytes maximum, one lowercase, one uppercase, one number. It does not ask for a name. It sends the first name `Admin`.

Each value comes from the first source that has it:

| Value    | 1. Explicit input                                       | 2. Prompt | 3. Without prompts          |
| -------- | ------------------------------------------------------- | --------- | --------------------------- |
| Email    | `--admin-email <email>`                                 | Yes       | `admin@example.com`         |
| Password | `CREATE_STRAPI_APP_ADMIN_PASSWORD` environment variable | Yes       | A generated random password |

The CLI prompts if `--non-interactive` is absent and stdin is a TTY. `--quickstart` still prompts. Without prompts, the CLI uses `admin@example.com` if the email is missing. If the password is missing, the CLI generates one. The CLI has no default password.

The CLI has no password flag, because a flag value goes into shell history and the process list. The environment variable does not start with `STRAPI_ADMIN_`, because Vite exposes those variables to the admin bundle. At startup, the CLI reads the variable and removes it from `process.env`. The dependency install, its lifecycle scripts, the seed, and `develop` never see it.

After the dependency install and the seed, the CLI runs `strapi admin:create-user --email <email> --firstname Admin` in the new project. It passes the password through the `STRAPI_CLI_ADMIN_PASSWORD` environment variable of that child process, never through its arguments. `admin:create-user` reads that variable and deletes it from `process.env` before the app loads, so plugins and bootstrap code never see it. It uses the value only when it does not prompt. The name is duplicated in both packages, and the `admin:create-user` unit tests pin it.

The generated password has 24 characters from `a-z`, `A-Z`, and `0-9`, with at least one of each class. The CLI picks each character with `crypto.randomInt`. The password passes the same strength rules as a typed password. The CLI shows the email and the generated password once, at the end of the installation, and only if `admin:create-user` succeeded. See "Secrets output" for where they go.

Templates can pin an older `@strapi/strapi`. The CLI searches the `admin:create-user --help` output for `STRAPI_CLI_ADMIN_PASSWORD`. If the name is absent, the admin step fails.

If the admin step fails, for example because the database server is down, the CLI keeps the project. It prints the error and `<package manager> run strapi admin:create-user --with-admin-token`, does not start the app, and exits with code 1. With `--no-admin-token`, the printed command has no `--with-admin-token`.

With `--no-install`, the CLI cannot run the command. It skips the admin step and adds the command to the "To get started" text. If `--admin-email` is set, the CLI prints a warning that the flag is ignored. The programmatic `createStrapi(scope)` export, used by `tests/helpers/test-app.js`, creates no admin user.

The CLI sends `willCreateAdminUser`, `didCreateAdminUser`, and `didNotCreateAdminUser` events. Each event carries `passwordGenerated`. `didCreateAdminUser` also carries `hasAdminToken`. The events never carry the email, the password, or the token.

## Admin token

An admin token is an API token with `kind: 'admin'`. It belongs to one admin user, carries a list of admin permissions, and authenticates admin API requests with `Authorization: Bearer <token>`. The service is `api-token-admin` in `packages/core/admin/server/src/services/api-token.ts`.

The CLI passes `--with-admin-token` to `strapi admin:create-user`, unless `--no-admin-token` is set. `--no-admin-token` keeps the admin user mandatory and skips only the token. With `--with-admin-token`, `admin:create-user` does the following:

1. It creates the user and the token in one `strapi.db.transaction`. If the token creation fails, the database rolls back the user, so the command can run again.
2. It loads the new user with its roles, because the token service checks the Super Admin role of the owner.
3. It copies every permission of the user (`permission.findUserPermissions`, then `permission.sanitizePermission`) into the token. The token keeps `action`, `subject`, `properties`, and `conditions`.
4. It names the token `Installation token` and sets a lifespan of 30 days.
5. It prints the key on its own stdout line: `Admin token: <key>`.

The CLI pipes the stdout of `admin:create-user` and does not print it. It reads the key with `/^Admin token: ([a-f0-9]+)$/m`. If the line is missing, the admin step fails. The CLI shows the key once, at the end of the installation, after the generated password. See "Secrets output". The database keeps a hash and an encrypted copy of the key. The token owner can show the key again in the admin panel, in Settings > Admin tokens.

The option name and the output prefix are duplicated in both packages. The `admin:create-user` unit tests pin them. If the `--help` output of the installed `@strapi/strapi` has no `--with-admin-token`, the CLI creates the user without a token and prints a warning.

The token permissions are a copy. If a later content type adds permissions to the Super Admin role, the token does not get them. The user can edit the token in the admin panel.

## Secrets output

The generated password and the admin token are secrets. Where the CLI shows them depends on stdout:

| stdout                                | Output                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A TTY (a person at a terminal)        | The CLI prints the secrets at the end of the installation.                                        |
| Not a TTY (CI, Docker builds, agents) | The CLI writes the secrets to `.strapi-credentials.json` in the project and prints only the path. |

The file holds the email, the generated password, and the admin token. A password that the user chose is never written. The CLI creates the file with mode `0600`, so only its owner can read it. It also restricts an existing file. If the CLI cannot write the file, it prints a warning and never falls back to printing the secrets.

The generated `.gitignore` lists `.strapi-credentials.json`. If a template brings its own `.gitignore`, the CLI adds the entry before `git init`, so the file never reaches the first commit.

In a Docker build, the file stays in the image layer, like the SQLite database. Delete it in the same build step, or copy the values out first.

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
