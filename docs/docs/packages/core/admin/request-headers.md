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

- The token refresh call to `/admin/access-token` (`postAccessToken`).
- The call to `/admin/project-type` in [`browserStrapi.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/utils/browserStrapi.ts). It runs before the plugins register.
- A plugin's own `fetch` or `XMLHttpRequest`. Code that does not use the fetch client must call `unstable_getRequestHeaders()` and add the result to its request.

## How the headers are merged

The fetch client builds the headers with `Headers.set()`. Header names are case-insensitive, so a later source replaces an earlier one whatever its casing:

1. The defaults: `Accept`, `Content-Type` and `Authorization`.
2. The provider headers, in the order the providers were registered.
3. The `headers` option of the call.

A provider cannot replace `Authorization`, `Content-Type` or `Accept`: these headers are left out of its result. A header whose value is `undefined` or `null` is not sent. For a `FormData` body, `post` and `put` remove `Content-Type`, so the browser sets the multipart boundary.

## When the providers are read

A call reads the providers once, when it starts. The retry after a 401 sends the same values as the first attempt. Without this, a write sent while the tab worked in one space could be replayed in another space if the tab switched while the token refreshed. `uploadFileViaXHR` also reads the providers once and reuses them for its retry.

## When a provider fails

If a provider throws, or returns a header that the browser cannot send, the request fails with a `RequestHeadersError` and is not sent. For a header that cannot be sent, the message names the header. For a provider that throws, the thrown error is the `cause`. Header values must be Latin-1 without line breaks, so send identifiers rather than display names.

The request fails instead of going out without the header, because the server could then run it in the wrong context, for example the default space. The RTK Query base query returns the error as a `SerializedError` named `RequestHeadersError`.

## CORS

When the admin is hosted on another origin than the server, the browser sends a preflight request before a request with a custom header. The `strapi::cors` middleware only allows `Content-Type`, `Authorization`, `Origin` and `Accept` by default ([`cors.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/middlewares/cors.ts)). Core does not add the provider headers to this list. The project adds the header names to the `headers` option of `strapi::cors`, or the browser blocks the requests.
