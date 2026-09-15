# Testing

## Unit tests

- Co-located under `<component>/tests/<Component>.test.tsx`.
- Use the workspace `@strapi/admin-test-utils` `render` helper — it wires
  the providers (intl, theme, store, router, RTK Query).
- HTTP mocking is **msw v2**, not v1.

### msw v2 pattern

```ts
import { http, HttpResponse } from 'msw';

server.use(
  http.get('/upload/folders', () => HttpResponse.json({ data: [] }), {
    once: true,
  }),
  http.put('/upload/:id', async ({ request, params }) => {
    return HttpResponse.json({ data: { id: Number(params.id) } });
  })
);
```

If `rest.get(path, (req, res, ctx) => res(ctx.json(...)))` appears anywhere
in a test, you have stale msw. Run `yarn install`, clear the nx cache
(`nx reset`), and rebuild the `admin-test-utils` dist.

### FormData bodies

`await request.formData()` **hangs under jsdom** when the FormData
contains a real `File` blob. Assert on metadata (id, content-type,
presence of body) instead and trust integration tests for the body.

## E2E tests

- Located at `tests/e2e/tests/media-library/*.spec.ts`.
- Gate every suite with
  ```ts
  describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')(
    'Suite name',
    () => { ... }
  );
  ```
  CI runs these in the `e2e_media_library` job; the `legacy` job runs `tests/media-library/legacy/`.

### Page Objects

- Extend `AssetsPage` (or create a new POM that extends `BasePage`) for
  feature work. Don't inline selectors in specs.
- `BasePage` exposes cross-cutting helpers: `waitForUploadSuccess`,
  `getSuccessMessage`, `getErrorMessage`, `getConfirmDialog`,
  `confirmAlertDialog`, `pickFile`.
- `assetDetailsDrawer` in `AssetsPage` is a locator filtered by the "File
  info" heading. Uniqueness matters.

### Strict-mode locator pitfalls

Inside a drawer that also renders an Alert (the in-drawer success/error
toast), `getByRole('button', { name: 'Close' })` matches **two** nodes —
the drawer X and the Alert close button. Either:

- Assert visibility on the drawer locator itself (`assetDetailsDrawer`
  is already unique).
- Or scope by ancestor: `assetDetailsDrawer.locator(...).getByRole(...)`.

### File picker

```ts
await assetsPage.pickFile(
  () => assetsPage.assetDetailsDrawer.getByRole('button', { name: /Replace/i }).click(),
  replacementPath
);
```

`pickFile` registers the chooser listener BEFORE the click — without
that race fix, Playwright misses the event under headed mode.

### Running

```
E2E_MEDIA_LIBRARY=current yarn test:e2e tests/media-library/<feature>.spec.ts
```

Strip any `test.only` before pushing.
