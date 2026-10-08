---
title: Future Flags
description: 'Feature flags that enable unstable features for testing and community feedback.'
---

In Strapi, we have incoming features that are not yet ready to be shipped to all users, but we aim to keep them updated with our codebase. Additionally, we want to offer community users the opportunity to provide early feedback on these new features or changes.

To achieve this, we use future flags, which enable unstable features **at your own risk**. These flags may change or be removed, and they may contain breaking changes.

A future flag gates a feature that has not shipped yet. Enabling one means the feature is likely to change or be removed, and parts of it may still be under development.

The flags Strapi declares are listed in `FeaturesFutureFlags` ([`features.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/types/src/core/config/features.ts)):

| Flag                            | Gates                                                         |
| ------------------------------- | ------------------------------------------------------------- |
| `experimental_firstPublishedAt` | The `firstPublishedAt` attribute on draft and publish content |
| `unstableNextDesignSystem`      | Building the admin panel against the next design system       |

The type also accepts any other string key, so a plugin can read its own flag without changing `@strapi/types`.

## How to enable a future flag

Add the flag under `future` in the `config/features.(js|ts)` file of your Strapi application. Create the file if it does not exist.

```ts
// config/features.ts

export default ({ env }) => ({
  future: {
    unstableNextDesignSystem: true,
    experimental_firstPublishedAt: env.bool('STRAPI_FEATURES_FUTURE_FIRST_PUBLISHED_AT', false),
  },
});
```

## How to add and read a future flag

Developers who introduce an unstable feature add its flag to `FeaturesFutureFlags`. The features config is part of the config object, so `strapi.config.get('features')` returns it.

To check a flag, use the API for your side of the code:

- **Server**: `strapi.features.future.isEnabled('flagName')`. The `features` service is created in [`services/features.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/features.ts). There is no `strapi.future` object.
- **Admin panel**: `window.strapi.future.isEnabled('flagName')`. The admin reads the features config that was passed in when the admin panel was built ([`browserStrapi.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/utils/browserStrapi.ts)).

Both return `true` only when the flag is set to `true`.

## Permanent flags are not future flags

A flag at the top level of `features` (for example `useLegacyMediaLibrary`) is supported configuration, not an unstable preview. Read it with `strapi.features.isEnabled('flagName')` on the server and `window.strapi.featureFlags.isEnabled('flagName')` in the admin panel.
