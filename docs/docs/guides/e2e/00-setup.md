---
title: Setup
tags:
  - testing
  - e2e
  - playwright
  - infrastructure
---

## Overview

This document explains at a high level how we create our app instance, run the e2e tests and what technology we're using for e2e tests. As well as a small section on writing tests.

## Get Started

To run the e2e tests, you must first install the playwright browsers.

```shell
npx playwright install
```

Because we require a "fresh" instance to assert our e2e tests against this is included in the testing script so all you need to run is:

```shell
yarn test:e2e
```

This will spawn by default a Strapi instance per testing domain (e.g. content-manager) in `test-apps` where the an individual `playwright.config` will start the instance and run tests against. It will automatically link the dependencies from the instance to the monorepo because `test-apps` are not considered part of the monorepo but we want to be using the most recent version of strapi (published or development) therefore meaning our most recent code changes can be tested against.

If you need to clean the test-apps folder because they are not working as expected, you can run `yarn test:e2e clean` which will clean said directory.

### Running specific tests

To run only one domain, meaning a top-level directory in e2e/tests such as "admin" or "content-manager", use the `--domains` option.

```shell
yarn test:e2e --domains=admin
npm run test:e2e --domains=admin
```

To run a specific file, you can pass arguments and options to playwright using `--` between the test:e2e options and the playwright options, such as:

```shell
# to run just the login.spec.ts file in the admin domain
yarn test:e2e --domains=admin -- login.spec.ts
npm run test:e2e --domains=admin -- login.spec.ts
```

Note that you must still include a domain, otherwise playwright will attempt to run every domain filtering by that filename, and any domains that do not contain that filename will fail with "no tests found"

### Running specific browsers

To run only a specific browser (to speed up test development, for example) you can pass `--project` to playwright with the value(s) `chromium`, `firefox`, or `webkit`

```shell
yarn test:e2e --domains=admin -- login.spec.ts --project=chromium
npm run test:e2e --domains=admin -- login.spec.ts --project=chromium
```

To debug your tests with a browser instance and the playwright debugger, you can pass the
`--debug` option like this:

```shell
yarn test:e2e --domains admin -- --debug
yarn test:e2e --domains admin -- login.spec.ts --debug
```

### Concurrency / parallellization

By default, every domain is run with its own test app in parallel with the other domains. The tests within a domain are run in series, one at a time.

If you need an easier way to view the output, or have problems running multiple apps at once on your system, you can use the `-c` option

```shell
# only run one domain at a time
yarn test:e2e -c 1
```

### Env Variables to Control Test Config

Some helpers have been added to allow you to modify the playwright configuration on your own system without touching the playwright config file used by the test runner.

| env var                      | Description                                  | Default            |
| ---------------------------- | -------------------------------------------- | ------------------ |
| PLAYWRIGHT_WEBSERVER_TIMEOUT | timeout for starting the Strapi server       | 16000 (160s)       |
| PLAYWRIGHT_ACTION_TIMEOUT    | playwright action timeout (ie, click())      | 15000 (15s)        |
| PLAYWRIGHT_EXPECT_TIMEOUT    | playwright expect waitFor timeout            | 10000 (10s)        |
| PLAYWRIGHT_TIMEOUT           | playwright timeout, for each individual test | 30000 (30s)        |
| PLAYWRIGHT_OUTPUT_DIR        | playwright output dir, such as trace files   | '../test-results/' |
| PLAYWRIGHT_VIDEO             | set 'true' to save videos on failed tests    | false              |

## Strapi Templates

The test-app you create uses a [template](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/installation/templates.html) found at `e2e/app-template` in this folder we can store our premade content schemas & any customisations we may need such as other plugins / custom fields / endpoints etc.

If you add anything to the template, be sure to add this information to [the docs](/testing/e2e/app-template).

## Running tests with environment variables (needed to run EE tests)

To set specific environment variables for your tests, a `.env` file can be created in the root of the e2e folder. This is useful if you need to run tests with a Strapi license or set future flags.

## Running tests with future flags

If you are writing tests for an unstable future feature you will need to add `app-template/config/features.js`. Currently the app template generation does not take the config folder into consideration. However, the run-e2e-tests script will apply the features config to the generated app. See the documentation for [features.js](https://docs.strapi.io/dev-docs/configurations/features#enabling-a-future-flag)

## What is Playwright?

Playwright enables reliable end-to-end testing for modern web apps. It's cross browser, cross platform and cross language. At Strapi we use it for Javascript automated testing.

For more information check out their [docs](https://playwright.dev/docs/intro). If you're struggling with their APIs, then check out their specific [API documentation](https://playwright.dev/docs/api/class-playwright).

## What makes a good end to end test?

This is the million dollar question. E2E tests typically test complete user flows that touch numerous points of the application it's testing, we're not interested in what happens during a process, only the user perspective and end results. Consider writing them with your story hat on. E.g. "As a user I want to create a new entity, publish that entity, and then be able to retrieve its data from the content API".

Our E2E test suite should _at minimum_ cover the core business flows of the product and this is lead by the QA defined set for this. Consult with your QA if you're not sure.
