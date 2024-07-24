---
title: Introduction
description: An intro into the plugin commands of the Strapi CLI
tags:
  - CLI
  - commands
  - plugins
---

:::caution
This is an experimental API that is subject to change at any moment, hence why it is not documented in the [Strapi documentation](https://docs.strapi.io/dev-docs/cli).
:::

## Available Commands

- [plugin:build](build) - Build a plugin for publishing
- [plugin:watch](watch) - Watch & compile a plugin in local development

## Setting up your package

In order to build/watch/check a plugin you need to have a `package.json` that must contain the following fields:

- `name`
- `version`

In regards to the export keys of your package.json because a plugin _typically_ has both a server and client
side output we recommend doing the following:

```json
{
  "name": "@strapi/plugin",
  "version": "1.0.0",
  "exports": {
    "./strapi-admin": {
      "types": "./dist/admin/src/index.d.ts",
      "source": "./admin/src/index.ts",
      "import": "./dist/admin/index.mjs",
      "require": "./dist/admin/index.js",
      "default": "./dist/admin/index.js"
    },
    "./strapi-server": {
      "types": "./dist/server/src/index.d.ts",
      "source": "./server/src/index.ts",
      "import": "./dist/server/index.mjs",
      "require": "./dist/server/index.js",
      "default": "./dist/server/index.js"
    },
    "./package.json": "./package.json"
  }
}
```

We don't use `main`, `module` or `types` on the root level of the package.json because of the aforementioned reason (plugins don't have one entry).
If you've not written your plugin in typescript, you can omit the `types` value of an export map. This is the minimum setup required to build a plugin.
