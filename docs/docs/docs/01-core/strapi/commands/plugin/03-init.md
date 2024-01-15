---
title: plugin:init
description: An in depth look at the plugin:init command of the Strapi CLI
tags:
  - CLI
  - commands
  - plugins
  - initialization
---

The `plugin:init` command is used to create a plugin, by default in `src/plugins` – because this is the strapi CLI we assume we're in a user app by default. This is done by using `pack-up` underneath and a unique template configuration.

## Usage

```bash
strapi plugin:init [path]
```

### Options

```bash
Create a new plugin at a given path.

Options:
  -d, --debug  Enable debugging mode with verbose logs (default: false)
  --silent     Don't log anything (default: false)
  -h, --help   Display help for command
```

## How it works

The command sequence can be visualised as follows:

- Ask the user a series of questions via prompts
- Generate a plugin folder structure based on that template
