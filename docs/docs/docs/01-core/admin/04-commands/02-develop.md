---
title: Develop
tags:
  - commands
  - admin
  - develop
---

## How it works

The develop command sets itself up much like the [build](build) command. Once we've injected our middlewares, we load the strapi instance and then generate the types based off the user's instance as well as potentially compiling any TS server code if we're in a TS project. The final step is to watch the project directory so we can restart the strapi instance in real-time as a user is developing their project & being the actual strapi instance.

## CLI Usage

```bash
strapi develop
```

### Options

```bash
Start your Strapi application in development mode

Options:
  --polling         Watch for file changes (default: false) – Whether to use fs.watchFile (backed by polling), or fs.watch, this is passed directly to chokidar
  --no-build        [deprecated]: there is middleware for the server, it is no longer a separate process
  --watch-admin     Watch the admin for changes (default: false)
  --browser <name>  [deprecated]: use open instead
  --open            Open the admin in your browser (default: true)
  -h, --help        Display help for command
```

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
   * Whether or not to open the browser after the build is complete.
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
