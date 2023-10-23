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
This is done by using `pack-up` underneath and a specific configuration, for this command we _do not_ look for a `packup.config` file.

## Usage

```bash
strapi plugin:build
```

### Options

```bash
Bundle your strapi plugin for publishing.

Options:
  --force      Automatically answer "yes" to all prompts, including potentially destructive requests, and run non-interactively.
  -d, --debug  Enable debugging mode with verbose logs (default: false)
  --silent     Don't log anything (default: false)
  --sourcemap  produce sourcemaps (default: false)
  --minify     minify the output (default: false)
  -h, --help   Display help for command
```

## How it works

The command sequence can be visualised as follows:

- Load package.json
- Validate that package.json against a `yup` schema
- Validate the ordering of an export map if `pkg.exports` is defined
- Create a set of "bundles" to build ignoring the package.json exports map that is _specifically_ set up for strapi-plugins.
- Pass the created config to `pack-up`'s build API.
- Finish
