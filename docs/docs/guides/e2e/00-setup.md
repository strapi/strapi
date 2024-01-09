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

## Strapi Templates

The test-app you create uses a [template](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/installation/templates.html) found at `e2e/app-template` in this folder we can store our premade content schemas & any customisations we may need such as other plugins / custom fields / endpoints etc.

If you add anything to the template, be sure to add this information to [the docs](/testing/e2e/app-template).

## What is Playwright?

Playwright enables reliable end-to-end testing for modern web apps. It's cross browser, cross platform and cross language. At Strapi we use it for Javascript automated testing.

For more information check out their [docs](https://playwright.dev/docs/intro). If you're struggling with their APIs, then check out their specific [API documentation](https://playwright.dev/docs/api/class-playwright).

## What makes a good end to end test?

This is the million dollar question. E2E tests typically test complete user flows that touch numerous points of the application it's testing, we're not interested in what happens during a process, only the user perspective and end results. Consider writing them with your story hat on. E.g. "As a user I want to create a new entity, publish that entity, and then be able to retrieve its data from the content API".

Our E2E test suite should _at minimum_ cover the core business flows of the product and this is lead by the QA defined set for this. Consult with your QA if you're not sure.
