---
title: Providers
description: 'Documentation of upload provider implementations.'
tags:
  - backend
review_notes:
  - 'The link to the installation guide on docs.strapi.io points to a v4 URL. Check where it lands.'
  - '`createProvider` wraps only the members that are functions (https://github.com/strapi/strapi/pull/28710): an `undefined` member stays missing, and the defaults of `isPrivate`, `getSignedUrl` and `checkFileSize` apply. Check the paragraphs that say the plugin wraps every member, and that an `undefined` member throws.'
status: needs-review
---

# Provider

Extends the upload plugin, to connect to different external services or applications, such as Amazon S3 buckets, Cloudinary, etc.

**In the case of the Upload plugin, the provider should be able to upload files to a remote server and delete them.**

## Using a provider

To use a provider, you need to install it and configure it in the `./config/plugins.js` file.

More info about installing providers on [strapi docs](https://docs.strapi.io/developer-docs/latest/development/providers.html#installing-providers).

## Provider development

A provider is a module that exports an `init(providerOptions)` function. The upload plugin loads the module in `createProvider` ([`server/src/register.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/server/src/register.ts)) with `require`, calls `init` with the `providerOptions` of the upload config, and checks the object it returns. The plugin reads `init` from what `require` returns, with no `.default` interop, so the module's CommonJS export must be the object that holds `init`. Members besides `init` are allowed on the module, such as a `name`.

The object `init` returns has the following methods:

- `upload(file)` or `uploadStream(file)`: at least one. They store the file and set its `url`. The plugin calls `uploadStream` when the provider implements it, with a `stream` on the file, and `upload` otherwise, with a `buffer` on the file.
- `delete(file)` (required): deletes a stored file, or one of its `formats`.
- `replace(newFile, oldFile)` and `replaceStream(newFile, oldFile)` (optional): replace a stored file in place. Without them, the plugin deletes the old file and uploads the new one.
- `checkFileSize(file, { sizeLimit })` (optional): throws when the file is too large. Without it, the plugin checks `sizeLimit` itself.
- `isPrivate()` (optional): whether files need a signed URL. Without it, files are public.
- `getSignedUrl(file)` (optional): returns `{ url }`, called only when `isPrivate()` returns `true`. Besides stored files, it signs the URLs the plugin finds in rich text and blocks. For those, the file has only `url`, `hash`, `ext` and `provider`, taken from the URL.

Each method can answer synchronously or with a promise. `upload`, `uploadStream`, `delete` and `getSignedUrl` get the method's entry of the `actionOptions` config as their second argument. `checkFileSize` gets `{ sizeLimit }` instead, and `replace` and `replaceStream` get the old file. Members outside this list are allowed. The plugin wraps every member of the object in an async function, so `strapi.plugin('upload').provider` is not the object `init` returns. With strict types, it is typed `UploadPluginProvider`: read [Typed contracts](./02-typed-contracts.md#provider).

Omit the members you do not implement, and never set one to `undefined`, as in `uploadStream: canStream ? uploadStream : undefined`. The plugin wraps every own key of the object, so an `undefined` member becomes a function that throws when called, and it hides the plugin's default for `isPrivate`, `getSignedUrl` and `checkFileSize`.

### Typing a provider

`@strapi/types` holds this contract as `Providers.Upload` ([`src/providers/upload.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/types/src/providers/upload.ts)):

- `Factory<Options>`: the provider module. `Options` types the `providerOptions`.
- `Provider`: the object `init` returns.
- `ProviderFile`: the file fields providers read and set. The upload plugin's own file types satisfy it.
- `StoredProviderFile`: a stored file, with its `url`. `delete`, and the old file of `replace` and `replaceStream`, get it.
- `SignableProviderFile`: what `getSignedUrl` gets: `url`, `hash`, `ext`, `path` and `provider`.
- `ActionOptions`: the action options, a loose record.
- `CheckFileSizeOptions`: the second argument of `checkFileSize`.

The package root also exports them as named types (`UploadProviderFactory`, `UploadProvider`, `UploadProviderFile`, and so on), so the declarations that a provider emits import them from `@strapi/types` itself.

The methods use method syntax, so a provider can declare its own, narrower file and options types, as the bundled providers do.

#### In a provider package

Check the module with `satisfies`. It needs `@strapi/types` only as a dev dependency, through a type-only import, and no runtime dependency on Strapi. Export the module with `export =`, so the compiled module is the CommonJS export the plugin reads:

```ts
import type { Providers } from '@strapi/types';

type Options = { baseUrl: string };

export = {
  init(options: Options) {
    return {
      async uploadStream(file) {
        file.url = `${options.baseUrl}/${file.hash}${file.ext}`;
      },
      async delete(file) {},
    };
  },
} satisfies Providers.Upload.Factory<Options>;
```

`export default` compiles to `exports.default`, which the plugin does not read, and fails at boot with `provider.init is not a function`. A bundler must emit `module.exports =` for the default export, as rollup does with `output.exports: 'auto'` or `'default'`.

`satisfies` on the object literal types the parameters that the provider leaves to inference from the contract. For example, `customParams = {}` becomes `ActionOptions`. To keep their own types, declare the module first and check it in a separate statement, as the bundled providers do:

```ts
const providerModule = {
  init(options: Options) {
    // ...
  },
};

providerModule satisfies Providers.Upload.Factory<Options>;

export = providerModule;
```

#### In an application

`factories.createUploadProvider` from `@strapi/strapi` types a module where it is written and returns it unchanged, with its own type: `init`'s parameters and the provider's members outside the contract keep theirs. Annotate `init`'s options, with an inline type or an interface: without an annotation, they are the `providerOptions` record of the upload config.

```ts
import { factories } from '@strapi/strapi';

export = factories.createUploadProvider({
  init(options: { baseUrl: string }) {
    return {
      async uploadStream(file) {
        file.url = `${options.baseUrl}/${file.hash}${file.ext}`;
      },
      async delete(file) {},
    };
  },
});
```

Editors complete the contract members in JavaScript too. Use `module.exports =` and type the options with JSDoc:

```js
const { factories } = require('@strapi/strapi');

module.exports = factories.createUploadProvider({
  /** @param {{ baseUrl: string }} options */
  init(options) {
    return {
      async uploadStream(file) {
        file.url = `${options.baseUrl}/${file.hash}${file.ext}`;
      },
      async delete(file) {},
    };
  },
});
```

An application can also use `satisfies`, with `import type { Providers } from '@strapi/strapi'`.
