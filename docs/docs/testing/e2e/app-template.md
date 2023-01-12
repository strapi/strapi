---
title: App Template
tags:
  - testing
  - e2e
  - template
  - infrastructure
---

## Overview

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
  await page.request.fetch('http://localhost:1337/api/database-dump', {
    method: 'POST',
  });
});
```

This endpoint does not have a `body`.

#### What does it do?

This endpoint `DELETES` every row from every table _excluding_ the "core" tables – normally prefixed with `strapi_`.

#### Why do we have it?

This lets us wipe the entire test instance _if_ we need to. DTS does technically does this already for us. But nonetheless, its useful.
