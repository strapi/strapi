---
title: Future Flags
---

In Strapi, we have incoming features that are not yet ready to be shipped to all users, but we aim to keep them updated with our codebase. Additionally, we want to offer community users the opportunity to provide early feedback on these new features or changes.

To achieve this, we utilize future flags, which provide a way to enable unstable features **at your own risk**. Please considered that these flags may be subject to change, removal and it's possible that they contain breaking changes.

Future flags can be used for unstable features that have not yet been shipped. So, if you decide to enable an unstable feature (prefixed with `unstable`), please be aware that this feature is likely to be modified or even removed. It's also highly probable that this unstable feature is not fully ready for use; some parts may still be under development or using mock data at the moment.

Additionally, future flags can be utilized for enabling coming breaking changes in upcoming versions (when prefixed by `vX`, with 'X' being the target version). In this scenario, if you decide to enable a future flag for a breaking change, please consider that you will need to migrate your application to adapt to this breaking change.

## How to enable a future flag.

To enable a future flag, you should add it to your config/features.(js|ts) file in your Strapi application. If you don't have this file, create one.

```ts
// config/features.ts

export default {
  future: {
    unstableFeatureName: true,
    v5breakingChange: env('STRAPI_FEATURES_FUTURE_V5BREAKINGCHANGE', false),
  },
};
```

## How to add and start using a future flag.

Developers are responsible for adding new future flags if they intend to introduce a new unstable feature into the Strapi codebase. Features config is part of the config object and can be easily accessed with `strapi.config.get('features')`.

We also provide an API in the strapi object that allows you to check if a future flag is enabled. You can do this using the following method: `strapi.future.isEnabled('featureName')`.
