---
title: plugin:build
description: An in depth look at the plugin:build command of the Strapi CLI
tags:
  - CLI
  - commands
  - plugins
  - building
---

The `plugin:build` command is used to build plugins in a CJS/ESM compatible format that can be instantly published to NPM.
This is done by looking at the export fields of a package.json e.g. `main`, `module`, `types` and `exports`. By using the
exports map specifically we can build dual plugins that support a server & client output.

## Usage

```bash
strapi plugin:build
```

### Options

```bash
Bundle your strapi plugin for publishing.

Options:
  -y, --yes    Skip all confirmation prompts (default: false)
  -d, --debug  Enable debugging mode with verbose logs (default: false)
  -h, --help   Display help for command
```

## Setting up your package

In order to build a plugin you need to have a `package.json` that must contain the following fields:

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
      "types": "./dist/admin/index.d.ts",
      "source": "./admin/src/index.ts",
      "import": "./dist/admin/index.mjs",
      "require": "./dist/admin/index.js",
      "default": "./dist/admin/index.js"
    },
    "./strapi-server": {
      "types": "./dist/server/index.d.ts",
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

## How it works

The command sequence can be visualised as follows:

- Load package.json
- Validate that package.json against a `yup` schema
- Validate the ordering of an export map if `pkg.exports` is defined
- Create a build context, this holds information like:
  - The transpilation target
  - The external dependencies (that we don't want to bundle)
  - Where the output should go e.g. `dist`
  - The exports we're about to use to create build tasks
- Create a list of build tasks based on the `exports` from the build context, these can currently either be `"build:js"` or `"build:dts"`
- Pass the build task to a specific task handler e.g. `vite` or `tsc`
- Finish

## Overriding settings

Most settings are currently hard coded into the command since we do not support a configuration file at present, however some options can be overwritten by adding values to the `package.json`.

### Browserslist

By adding the `browserslist` key to your `package.json` you can overwrite the default value (seen below):

```json
{
  "name": "@strapi/plugin",
  "version": "1.0.0",
  "browserslist": [
    "last 3 major versions",
    "Firefox ESR",
    "last 2 Opera  versions",
    "not dead",
    "node 16.0.0"
  ]
}
```
