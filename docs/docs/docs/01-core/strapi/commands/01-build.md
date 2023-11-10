---
title: Build
tags:
  - CLI
  - commands
  - admin
  - build
---

The `build` command is used to build the strapi admin panel as a SPA ready to be served by the strapi server.

## Usage

```bash
strapi build
```

### Options

```bash
Build the strapi admin app

Options:
  -d, --debug        Enable debugging mode with verbose logs (default: false)
  --minify           Minify the output (default: true)
  --no-optimization  [deprecated]: use minify instead
  --silent           Don't log anything (default: false)
  --sourcemap        Produce sourcemaps (default: false)
  --stats            Print build statistics to the console (default: false)
  -h, --help         Display help for command
```

## How it works

See [Admin build pipeline](/docs/core/admin/commands/build) for more information.
