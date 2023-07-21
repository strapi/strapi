---
title: App Template
tags:
  - testing
  - e2e
  - template
  - infrastructure
---

## Overview

An app template has been created in `e2e/app-template` which provide some customizations and utilities to allow the tests to run. Note that if any changes are made to the app template, you will need to run `yarn test:e2e:clean` to update the test apps with the new template.

Here you can read about what content schemas the test instance has & the API customisations we've built (incl. why we built them).

## Content Schemas

:::note
There's no content yet!
:::

## API Customisations

### Database

found at `template/src/api/database`

#### Usage

```ts
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.request.fetch('http://localhost:1337/api/database/dump', {
    method: 'POST',
  });
});
```

This endpoint does not have a `body`.

#### What does it do?

This endpoint `DELETES` every row from every table _excluding_ the "core" tables – normally prefixed with `strapi_`.

#### Why do we have it?

This lets us wipe the entire test instance _if_ we need to. DTS does technically
does this already for us. But nonetheless, its useful.

### Config

found at `template/src/api/config`

#### Rate Limit

##### Usage

```ts
async function toggleRateLimiting(page, enabled = true) {
  await page.request.fetch('/api/config/ratelimit/enable', {
    method: 'POST',
    data: { value: enabled },
  });
}
```

##### What does it do?

This endpoint can be used to enable or disable the rate limitting middleware in
strapi. When enabled login requests for each user are limitted to 5 in 5 minutes.

##### Why do we have it?

There are cases where we disable the rate limit to test multiple incorrect login
attempts.

#### Admin Auto Open

##### Usage

```ts
  bootstrap({ strapi }) {
    strapi.service('api::config.config').adminAutoOpenEnable(false);
  },
```

##### What does it do?

This endpoint can be used to enable or disable admin auto open.

##### Why do we have it?

It can be frustrating to work with the e2e tests locally. If auto open is set to
true a browser window will open each time you run the e2e tests as the strapi
app starts for the first time. Because of this we disable it during the
bootstrap phase of the test app instance.
