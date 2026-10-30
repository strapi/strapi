---
title: Enterprise plugins
description: 'How the e2e job checks that Strapi changes do not break the private Enterprise plugins.'
tags:
  - testing
  - e2e
---

## Overview

The Enterprise plugins live in a private repository. They use Strapi APIs, so a change in this repository can break them. The `e2e_enterprise_plugins` job in [`tests.yml`](https://github.com/strapi/strapi/blob/develop/.github/workflows/tests.yml) runs the [`enterprise-plugins`](https://github.com/strapi/strapi/blob/develop/tests/e2e/tests/enterprise-plugins) e2e domain against the latest published version of each plugin.

## When the job runs

- On pull requests from a branch of `strapi/strapi`.
- On pushes to `develop` and `main`.

Pull requests from forks skip the job because GitHub gives no secrets to fork runs, so the job cannot install the plugins.

## Keep the code of the plugins private

The code of the Enterprise plugins is not public. Keep these rules when you change the job:

- Never allow the job to run on third-party code: fork code could then read the license and the plugins.
- Never save the plugins in caches or artifacts: that would make their code public.

## Run the tests locally

You need a Strapi license that includes the features of the Enterprise plugins, such as `cms-byok-ai` for BYOK.

1. Put the license in `tests/e2e/.env` as `STRAPI_LICENSE` (see [Setup](./00-setup.md#running-enterprise-ee-tests-locally)).
2. Install the plugins once, in any directory:

   ```shell
   export STRAPI_LICENSE="<your license>"
   tests/scripts/install-enterprise-plugins.sh "$HOME/.strapi-e2e/enterprise-plugins"
   ```

3. Run the domain. It runs only when you name it with `--domains`:

   ```shell
   export STRAPI_ENTERPRISE_PLUGINS_PATH="$HOME/.strapi-e2e/enterprise-plugins"
   yarn test:e2e:ee --setup --domains enterprise-plugins -- --project=chromium
   ```

[`tests/app-template/config/plugins.js`](https://github.com/strapi/strapi/blob/develop/tests/app-template/config/plugins.js) loads them from `STRAPI_ENTERPRISE_PLUGINS_PATH`.

## Add an Enterprise plugin

1. Add its package to [`tests/scripts/install-enterprise-plugins.sh`](https://github.com/strapi/strapi/blob/develop/tests/scripts/install-enterprise-plugins.sh).
2. Add its configuration to `tests/app-template/config/plugins.js`.
3. Add its tests to the `enterprise-plugins` domain.
