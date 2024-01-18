---
title: plugin:verify
description: An in depth look at the plugin:verify command of the Strapi CLI
tags:
  - CLI
  - commands
  - plugins
---

The `plugin:verify` command is simply a utility wrapper around the `pack-up` api [`check`](../../../../05-utils/pack-up/01-commands/03-check.mdx).
It is used to verify the output of your plugin before publishing it.

## Usage

```bash
strapi plugin:verify [path]
```

### Options

```bash
Verify the output of your plugin before publishing it.

Options:
  -d, --debug  Enable debugging mode with verbose logs (default: false)
  --silent     Don't log anything (default: false)
  -h, --help   Display help for command
```
