---
title: Testing
description: 'Unit and end-to-end tests of the Media Library admin: helpers, msw handlers, the two e2e suites, and what jsdom cannot catch.'
tags:
  - frontend
  - testing
  - e2e
status: draft
review_notes:
  - The local e2e commands in "Run the suites locally" were checked against the runner source but not run. Run them, then remove this note and the status.
---

# Testing

## Unit tests

Unit tests live in a `tests/` folder next to the code they test, for example `pages/Assets/components/AssetDetails/tests/AssetDetailsDrawer.test.tsx`. Jest runs them with [`jest.config.front.js`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/jest.config.front.js).

- Import the helpers from `@tests/utils`. The Jest config maps it to `admin/tests/utils.ts`, which re-exports `render`, `server` and the Testing Library helpers from `@strapi/admin/strapi-admin/test`. `render` wraps the component in the admin providers.
- [`admin/tests/setup.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/tests/setup.ts) starts the msw `server` and installs the default handlers from `admin/tests/handlers.ts` before each test. It also mocks `legacy/hooks/useTracking` and `legacy/hooks/useSettings` for every test.
- HTTP mocks use msw 2. Override a handler for one test with `server.use(...)`:

```ts
import { server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

let captured: { id: string; file: FormDataEntryValue | null } | undefined;

server.use(
  http.post('/upload/files/:id/replace', async ({ request, params }) => {
    const body = await request.formData();
    captured = { id: String(params.id), file: body.get('files') };
    return HttpResponse.json({ ...asset, name: 'replacement.png' });
  })
);
```

`request.formData()` returns the multipart body, files included. Two problems would break it without a patch. msw 2 clones each request before the resolver runs, and under undici the clone locks the body. A jsdom `FormData` body also loses its multipart encoding when undici serializes it across realms. The Jest environment of `@strapi/admin-test-utils` installs [`request-body-stash.ts`](https://github.com/strapi/strapi/blob/develop/packages/admin-test-utils/src/patches/request-body-stash.ts), which keeps the original string or `FormData` body on the request. `AssetDetailsDrawer.test.tsx` reads the replaced file this way.

### What jsdom cannot catch

jsdom has no layout engine. It computes no sizes, no overflow, no stacking and no pointer geometry. A unit test still passes when a layout breaks.

For example, a quarter turn in the crop editor takes the image out of the normal flow. The crop area then has no content to size it, so `AssetCropEditor.tsx` renders a spacer `div` in its place. Without the spacer, the crop area collapses, and the unit tests still pass.

Check positional changes in a real browser, and cover them with an e2e test.

## End-to-end tests

The specs are in [`tests/e2e/tests/media-library/`](https://github.com/strapi/strapi/tree/develop/tests/e2e/tests/media-library). The specs of the legacy Media Library are in its `legacy/` folder.

Each spec gates its suite on the `E2E_MEDIA_LIBRARY` variable:

```ts
describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')('Asset details', () => {
  // ...
});
```

Legacy specs check for `'legacy'` instead. Two checks enforce the gate:

- Without `E2E_MEDIA_LIBRARY`, the runner does not start the `media-library` domain at all, and prints why. This keeps both suites out of the shared e2e matrix.
- `tests/utils/__tests__/e2e-domains.test.ts` fails when a spec of the domain lacks the gate, or has a `test(` or `test.describe(` block at the top level.

CI runs the suites in two jobs of [`.github/workflows/tests.yml`](https://github.com/strapi/strapi/blob/develop/.github/workflows/tests.yml). Both set `runEE: false` (Community Edition), `domains: media-library` and `jestOptions: '--project=chromium'`.

| Job                        | Other inputs                                                 | Runs                                          |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| `e2e_media_library`        | `useLegacyMediaLibrary: false`, `mediaLibrarySuite: current` | The current Media Library specs               |
| `e2e_media_library_legacy` | `useLegacyMediaLibrary: true`, `mediaLibrarySuite: legacy`   | The legacy specs, on the legacy Media Library |

`useLegacyMediaLibrary` becomes the `USE_LEGACY_MEDIA_LIBRARY` variable, which `tests/app-template/config/features.js` reads. The admin UI gets the flag when it is built, not when the server starts. `yarn test:e2e` rebuilds the admin on every run, so the variable takes effect. If you run Playwright again against an existing test app, it keeps the UI of the last build.

Both jobs run on Chromium only. The comment on the jobs in `tests.yml` gives the reason: the upload helper `uploadFilesWithDragAndDrop` in `AssetsPage.ts` builds a `DataTransfer` to drop files, which the suite cannot use on WebKit. The helpers that move items by drag and drop use `page.mouse` and do not need it.

### Run the suites locally

See the [e2e setup](../../../../contributing/03-testing/e2e/00-setup.md) for the runner. Use `yarn test:e2e:ce` to match CI: plain `yarn test:e2e` switches to the Enterprise Edition when `STRAPI_LICENSE` is set. Local runs use Chromium unless you pass `--project`.

```bash
# Current Media Library
E2E_MEDIA_LIBRARY=current yarn test:e2e:ce --domains=media-library -- asset-details.spec.ts

# Legacy Media Library
USE_LEGACY_MEDIA_LIBRARY=true E2E_MEDIA_LIBRARY=legacy yarn test:e2e:ce --domains=media-library
```

Remove any `test.only` before you push.

### Page objects

- [`page-objects/AssetsPage.ts`](https://github.com/strapi/strapi/blob/develop/tests/e2e/tests/media-library/page-objects/AssetsPage.ts) covers the Media Library page. `page-objects/MediaField.ts` covers the `media` field. Add helpers there instead of writing selectors in specs.
- `assetsPage.assetDetailsDrawer` is the dialog that contains the "File info" heading. Start drawer queries from it.
- The close button in the drawer header and the close button of an in-drawer alert both have the accessible name "Close". Once an alert is visible, `getByRole('button', { name: 'Close' })` matches two elements and fails in strict mode, even inside the drawer locator. Use `closeAssetDetailsDrawer()`: it keeps only the button that has a `data-state` attribute, which the close button of the alert does not have.
- Start waiting for the file chooser before the click that opens it. `replaceAssetFromDrawer` calls `page.waitForEvent('filechooser')` first, then clicks, then awaits the promise. If you wait after the click, the event can fire before the listener exists.
