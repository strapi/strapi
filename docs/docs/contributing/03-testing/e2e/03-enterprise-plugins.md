---
title: Enterprise plugins
description: 'How the e2e job checks that Strapi changes do not break the private Enterprise plugins.'
tags:
  - testing
  - e2e
---

## Overview

Some Enterprise plugins, such as `@strapi-enterprise/plugin-byok`, live in a private repository. They use Strapi APIs, so a change in this repository can break them. The `e2e_enterprise_plugins` job in [`tests.yml`](https://github.com/strapi/strapi/blob/develop/.github/workflows/tests.yml) runs a small e2e suite against the latest published plugin to catch these breaks.

The suite is the `enterprise-plugins` domain in [`tests/e2e/tests/enterprise-plugins`](https://github.com/strapi/strapi/blob/develop/tests/e2e/tests/enterprise-plugins). It checks that:

- Strapi starts with the BYOK plugin, and the plugin shows in the list of plugins.
- The AI features show as available in their settings pages.
- AI Translation works from the admin, against a mock provider.

The tests make no real AI call. A small OpenAI-compatible server in the test process answers instead.

## When the job runs

- On pull requests from a branch of `strapi/strapi`.
- On pushes to `develop` and `main`.

Pull requests from forks skip the job. GitHub gives no secrets to fork runs, so the job cannot install the plugins. The push run on `develop` reports what a fork pull request broke, after the merge.

The job is part of the required `aggregate_test_result` check, so a failure blocks the merge. A skipped job does not block it.

## Keep the code of the plugins private

The code of the Enterprise plugins is not public: not their source, not their built files, and not the prompts they send to AI providers. The job follows these rules. Keep them when you change it.

- Never run the job, or any pull request code with the license, from `pull_request_target` or `workflow_run`. Fork code could then read the license and the plugins.
- The job restores caches but never saves them. The plugins are installed in `$RUNNER_TEMP`, outside the repository, with a temporary npm cache.
- The license never goes to disk. The npm configuration only references `${STRAPI_LICENSE}`.
- The mock provider never logs, stores, or returns the request body. Assertions only use the request path and the model name.
- Do not print the installed plugin files, the npm configuration, or the environment in the logs.

Test names, logs from Strapi, screenshots, traces, and the Trunk report can be public. They hold no plugin code.

## Reproduce a failure locally

You need a Strapi license that includes the `cms-byok-ai` feature and access to the Enterprise registry. Strapi employees can ask the Enterprise squad for one.

1. Put the license in `tests/e2e/.env` as `STRAPI_LICENSE` (see [Setup](./00-setup.md#running-enterprise-ee-tests-locally)).
2. Install the BYOK plugin outside the repository:

   ```shell
   export STRAPI_LICENSE="<your license>"
   tests/scripts/install-byok-plugin.sh "$HOME/.strapi-e2e/enterprise-plugins"
   ```

3. Run the domain. It runs only when you name it with `--domains`:

   ```shell
   export STRAPI_BYOK_PLUGIN_PATH="$HOME/.strapi-e2e/enterprise-plugins/node_modules/@strapi-enterprise/plugin-byok"
   yarn test:e2e:ee --setup --domains enterprise-plugins -- --project=chromium
   ```

When `STRAPI_BYOK_PLUGIN_PATH` is set, [`tests/app-template/config/plugins.js`](https://github.com/strapi/strapi/blob/develop/tests/app-template/config/plugins.js) loads the BYOK plugin from that path and points it to the mock provider.

## When the job fails

1. Read the Strapi logs in the job output (lines that start with `[WebServer]`). BYOK logs why it stays off, for example a missing license feature or a missing Strapi API.
2. Open the Playwright trace from the job artifacts.
3. If your change breaks the Enterprise plugins on purpose, or you cannot find the cause, contact the Enterprise squad before you merge. The code of the plugins is private, so the squad may need to change it.
