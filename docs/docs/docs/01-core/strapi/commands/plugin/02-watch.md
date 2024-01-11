---
title: plugin:watch
description: An in depth look at the plugin:watch command of the Strapi CLI
tags:
  - CLI
  - commands
  - plugins
  - building
---

The `plugin:watch` command is used to watch plugin source files and compile them to production viable assets in real-time.
This is done by using `pack-up` underneath and a specific configuration, for this command we _do not_ look for a `packup.config` file.

## Usage

```bash
strapi plugin:watch
```

### Options

```bash
Watch & compile your strapi plugin for local development.

Options:
  -d, --debug  Enable debugging mode with verbose logs (default: false)
  --silent     Don't log anything (default: false)
  -h, --help   Display help for command
```

## How it works

The command sequence can be visualised as follows:

- Load package.json
- Validate that package.json against a `yup` schema
- Validate the ordering of an export map if `pkg.exports` is defined
- Create a set of "bundles" to build ignoring the package.json exports map that is _specifically_ set up for strapi-plugins.
- Pass the created config to `pack-up`'s watch API.
- Run's indefinitely
