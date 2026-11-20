---
title: Request headers
description: 'How a plugin adds headers to the requests the admin sends to the Strapi server, and what happens when a provider fails.'
tags:
  - frontend
  - public-api
---

A plugin can add headers to the requests that the admin sends to the Strapi server, for example the space that a browser tab works in. The plugin registers a provider: a function that returns the headers. The API is unstable, so it can change in a minor release. Code: [`admin/src/utils/getFetchClient.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/utils/getFetchClient.ts).

```ts
register(app) {
  const removeHeaders = app.unstable_addRequestHeaders(() => ({
    'x-strapi-space': getSelectedSpace(),
  }));
}
```

`app.unstable_addRequestHeaders` returns a function that removes the provider. The same function is exported from `@strapi/admin/strapi-admin`, next to `unstable_getRequestHeaders`.

## Which requests get the headers

- Every request of the fetch client: `get`, `post`, `put` and `del` of `getFetchClient` and `useFetchClient`. The RTK Query `adminApi` uses the fetch client in its base query, so its endpoints get the headers too.
- Media Library uploads: `uploadFileViaXHR` and the upload from URLs in the upload package. They do not use the fetch client, so they call `unstable_getRequestHeaders()` themselves.

Requests that do not get the headers:

- Requests of the fetch client to `/admin/login`, `/admin/logout`, `/admin/access-token`, `/admin/init`, `/admin/registration-info`, `/admin/register`, `/admin/register-admin`, `/admin/forgot-password`, `/admin/reset-password` and `/admin/providers`. These requests have no context such as a space, so the fetch client does not read the providers for them, and a provider that fails cannot block a login or a logout. The match is on the exact path that the caller gives: `/admin/login-history` or `/admin/providers/options` still get the headers.
- The token refresh call to `/admin/access-token` in `postAccessToken`, which does not use the fetch client.
- The call to `/content-manager/preview/script` in [`Preview.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/content-manager/admin/src/preview/pages/Preview.tsx). It uses a plain `fetch`.
- The call to `/admin/project-type` in [`browserStrapi.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/utils/browserStrapi.ts). It runs before the plugins register.
- A plugin's own `fetch` or `XMLHttpRequest`. Code that does not use the fetch client must call `unstable_getRequestHeaders()` and add the result to its request.

## How the headers are merged

The fetch client builds the headers with `Headers.set()`. Header names are case-insensitive, so a later source replaces an earlier one whatever its casing:

1. The defaults: `Accept`, `Content-Type` and `Authorization`.
2. The provider headers, in the order the providers were registered.
3. The `headers` option of the call.

A provider cannot replace `Authorization`, `Content-Type` or `Accept`: these headers are left out of its result. A `headers` option of the call replaces a provider header with the same name.

A value that is `undefined` or `null` only skips the entry of that provider. If an earlier provider returned a value for the same name, the request still sends that value. If no provider returns a value, the request goes out without the header. Thus the server must reject a request that needs the header and does not have it. For a `FormData` body, `post` and `put` remove `Content-Type`, so the browser sets the multipart boundary.

## When the providers are read

A call reads the providers once, when it starts. The retry after a 401 sends the same values as the first attempt. Without this, a write sent while the tab worked in one space could be replayed in another space if the tab switched while the token refreshed. `uploadFileViaXHR` also reads the providers once and reuses them for its retry.

A Media Library upload drop reads the providers once, when the user drops the files. All files of the drop and all retries of these files send the same values, also when the tab switches space while the drop uploads. If the read fails, every file of the drop shows an upload error and no file is sent. `uploadFileViaXHR` reads the providers itself only when its caller does not give it the headers.

## When a provider fails

If a provider throws, returns a value that is not a plain object (for example a promise from an `async` function, an array or `null`), or returns an invalid header name or value, the request fails with a `RequestHeadersError` and is not sent. For an invalid header, the message names the header. For a provider that throws, the thrown error is the `cause`. Header values must be Latin-1 without line breaks, so send identifiers rather than display names. A forbidden name such as `Cookie`, `Origin`, `Sec-*` or `Proxy-*` does not fail: the browser drops it without an error.

The request fails instead of going out without the header, because the server could then run it in the wrong context, for example the default space. The RTK Query base query returns the error as a `SerializedError` named `RequestHeadersError`, so check `error.name` there. `instanceof RequestHeadersError` works only for errors from `getFetchClient` or `unstable_getRequestHeaders`.

## CORS

When the admin is hosted on another origin than the server, the browser sends a preflight request before a request with a custom header. The `strapi::cors` middleware only allows `Content-Type`, `Authorization`, `Origin` and `Accept` by default ([`cors.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/middlewares/cors.ts)). Core does not add the provider headers to this list. The project adds the header names to the `headers` option of `strapi::cors`, or the browser blocks the requests.

The middleware merges the options with `{ ...defaults, ...config }`, so a `headers` option replaces the default list. It does not add to it. Keep the default headers in the list. The object entry replaces the `'strapi::cors'` string entry in `config/middlewares.js`: do not keep both, because two cors entries break the preflight.

```js title="config/middlewares.js"
module.exports = [
  // ...
  {
    name: 'strapi::cors',
    config: {
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'x-strapi-space'],
    },
  },
  // ...
];
```
