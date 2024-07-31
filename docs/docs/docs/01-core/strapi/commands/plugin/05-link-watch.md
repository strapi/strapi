---
title: plugin:watch:link
description: An in depth look at the plugin:watch:link command of the Strapi CLI
tags:
  - CLI
  - commands
  - plugins
---

The `plugin:watch:link` command recompiles your plugin and pushes those changes to your local yalc registry to simulate using your plugin as a node_module in another project.

## Usage

```bash
strapi plugin:watch:link
```

### Options

```bash
Recompiles your plugin automatically on changes and runs yalc push --publish

Options:
  -d, --debug  Enable debugging mode with verbose logs (default: false)
  --silent     Don't log anything (default: false)
  -h, --help   Display help for command
```

## Why yalc?

npm link & yarn link unfortunately can easily break the [rules of hooks](https://legacy.reactjs.org/docs/hooks-rules.html) due to the way packages are resolved using symlinks.

Yalc bypass this problem as it more closely resembles installing a dependency as normal.
