# `@strapi/types`

⚠️ This package is mostly intended for Strapi internal use and should not be used directly. New versions might break without any prior notice.

Any type you should be using should be imported from `@strapi/strapi` instead.

## Upload provider contract

The upload provider contract is the exception, and is supported for provider authors from the first release after 5.62.0: `Providers.Upload` (also exported at the root as `UploadProviderFactory`, `UploadProvider`, `UploadProviderFile`, and so on) holds the types an upload provider module implements.

A provider package checks its module with `satisfies Providers.Upload.Factory<Options>` and a type-only import, so `@strapi/types` is only a dev dependency. Applications import the same types from `@strapi/strapi`, which also provides `factories.createUploadProvider`.
