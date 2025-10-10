---
title: Overview
tags:
  - CLI
  - commands
---

The CLI is largely contained to the `@strapi/strapi` package, however some packages are able to inject their own commands:

- [`@strapi/data-transfer`](/docs/core/data-transfer/intro)

## Structure of command

The CLI is built with `commander` and as such every command we create can be described as:

```ts
import { createCommand, Command } from 'commander';

type StrapiCommand = (params: { command: Command; argv: string[]; ctx: CLIContext }) => Command;

// usage

const myCommand: StrapiCommand = ({ argv, ctx }) => {
  // do something
  return createCommand('develop')
    .alias('dev')
    .option(
      '--no-build',
      '[deprecated]: there is middleware for the server, it is no longer a separate process'
    )
    .action((options) => {
      // do something with options & ctx
    });
};
```

These actions are then combined together in the `@strapi/strapi` package to be used as a complete CLI, the context provided to each command
supplies a number of useful properties:

```ts
interface CLIContext {
  cwd: string;
  logger: Logger;
  tsconfig?: TsConfig;
}
```

### `logger`

```ts
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
```

The shared logger means that any command can accept `--debug` and `--silent` flags to control the output of the CLI. Due to incorperating `ora` into the logger, we can also provide a spinner for long running tasks but more importantly, easily silence them when `--silent` is passed.

### `tsconfig`

If `tsconfig` is not _defined_ we can conclude that the project is not a TS project. However, if it is we have access to where the tsconfig is located as well as the parsed config itself.

```ts
interface TsConfig {
  config: ts.ParsedCommandLine;
  path: string;
}
```
