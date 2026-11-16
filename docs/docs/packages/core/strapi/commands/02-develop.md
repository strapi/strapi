---
title: Develop
description: 'Documentation of the Strapi develop command.'
tags:
  - cli
review_notes:
  - 'Lists `--watch-admin` without its default. The command sets it to `true`, and `--no-watch-admin` turns it off (`src/cli/commands/develop.ts`).'
status: needs-review
---

The `develop` command is used to develop your strapi node application e.g. creating content-types in the `content-type-builder` as well as "watching" the admin panel with webpack for local development whether in the strapi monorepo or in a standalone project.

## Usage

```bash
strapi develop
```

### Options

```bash
Start your Strapi application in development mode

Options:
  --polling         Watch for file changes in network directories (default: false)
  --watch-admin     Watch the admin panel for hot changes
  --open            Open the admin in your browser when develop starts (development only), even if an admin user exists
  --no-open         Do not open the admin in your browser, even on the first run
  -h, --help        Display help for command
```

## How it works

The admin opens in a browser from `Strapi.openAdmin()` after the server listens, and only in the `development` environment: with `NODE_ENV=production`, neither flag opens it. Without a flag, it opens only when no admin user exists and `admin.autoOpen` is not `false`.

`--open` opens the admin when the first worker starts, even if an admin user exists or `admin.autoOpen` is `false`. `--no-open` never opens it, including on the first run and on restarts.

On a restart after a file change (for example a Content-Type Builder save), the primary forks the new worker with `STRAPI_DEVELOP_RESTART=true`, but only after a worker's server has listened. A worker that failed before that (for example a TypeScript error) does not count, so the worker that replaces it keeps `--open`. A restarted worker ignores `--open` and uses the default behaviour. Once an admin user exists, `--open` does not open a new tab on each reload. While no admin user exists, the default behaviour still opens a tab on every restart, with or without `--open`. `--no-open` still applies.

The flag is passed to `createStrapi()` as the `open` option. It is kept on the Strapi instance, not in the app config, so a user `config/open.*` file still loads. Neither flag changes `config/admin`.

The admin dev server runs Vite in middleware mode, so it never opens a browser.

The develop command sets itself up much like the [build](./01-build.md) command. Once we've injected our middlewares, we load the strapi instance and then generate the types based off the user's instance as well as potentially compiling any TS server code if we're in a TS project. The final step is to watch the project directory so we can restart the strapi instance in real-time as a user is developing their project & being the actual strapi instance.

If a step fails after the strapi instance is loaded (for example the TS compile reports type errors), develop logs the errors, destroys the loaded instance so its cron jobs and other bootstrap work stop, closes the admin bundler when `--watch-admin` is on, and keeps watching. The next file change restarts the instance, and the new worker starts a new admin bundler. `destroy()` removes every process listener, so develop adds back an exit on `disconnect`: the worker exits when the primary exits or is killed. A file change also exits the worker when the IPC channel to the primary is closed.

If `destroy()` throws during that stop, the instance is only partly destroyed: cron, the server or the database connection can still run. Develop then logs the error, sends `stop` to the primary and exits the worker, so `strapi develop` exits instead of forking a second worker next to it. On a restart, a `destroy()` that throws does not send `killed`, so the primary does not fork a new worker either.

## Node Usage

```ts
import { develop, DevelopOptions } from '@strapi/admin/_internal';

const args: DevelopOptions = {
  // ...
};

await develop(args);
```

### Options

```ts
interface DevelopOptions extends CLIContext {
  /**
   * The directory to build the command was ran from
   */
  cwd: string;
  /**
   * The logger to use.
   */
  logger: Logger;
  /**
   * Open the admin in a browser after the server listens. `true` opens it on the first start of
   * the session, `false` never opens it, `undefined` keeps the default (only when no admin user
   * exists and `admin.autoOpen` is not `false`).
   */
  open?: boolean;
  /**
   * Watch for file changes in network directories
   */
  polling?: boolean;
  /**
   * The tsconfig to use for the build. If undefined, this is not a TS project.
   */
  tsconfig?: TsConfig;
  /**
   * Watch the admin for changes
   */
  watchAdmin?: boolean;
}

interface Logger {
  warnings: number;
  errors: number;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  spinner: (text: string) => Pick<ora.Ora, 'succeed' | 'fail' | 'start' | 'text'>;
}

interface TsConfig {
  config: ts.ParsedCommandLine;
  path: string;
}
```
