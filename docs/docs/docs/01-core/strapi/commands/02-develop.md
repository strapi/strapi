---
title: Develop
tags:
  - CLI
  - commands
  - admin
  - development
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
  --no-build        [deprecated]: there is middleware for the server, it is no longer a separate process
  --watch-admin     [deprecated]: there is now middleware for watching, it is no longer a separate process
  --browser <name>  [deprecated]: use open instead
  --open            Open the admin in your browser (default: true)
  -h, --help        Display help for command
```

## How it works

See [Admin development pipeline](/docs/core/admin/commands/develop) for more information.
