---
title: Testing
description: 'Unit and end-to-end tests of the Media Library admin: helpers, msw handlers, the two e2e suites, and what jsdom cannot catch.'
tags:
  - frontend
  - testing
  - e2e
status: draft
review_notes:
  - The local e2e commands in "Run the suites locally" were not run while writing this page. Run them, then remove this note and the status.
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

`request.formData()` returns the multipart body, files included. msw clones the request before the resolver runs, and the clone of a multipart body under undici is not reliable. `@strapi/admin-test-utils` works around it: [`request-body-stash.ts`](https://github.com/strapi/strapi/blob/develop/packages/admin-test-utils/src/patches/request-body-stash.ts) keeps the jsdom body on the request. `AssetDetailsDrawer.test.tsx` reads the replaced file this way.

### What jsdom cannot catch

jsdom has no layout engine. It computes no sizes, no overflow, no stacking and no pointer geometry. A unit test still passes when a layout breaks.

For example, a quarter turn in the crop editor takes the image out of the normal flow. The crop area then has no content to size it, so `AssetCropEditor.tsx` renders a spacer `div` in its place. Without the spacer, the crop area collapses and the editor looks blank, and the unit tests still pass.

Check positional changes in a real browser, and cover them with an e2e test.

## End-to-end tests

The specs are in [`tests/e2e/tests/media-library/`](https://github.com/strapi/strapi/tree/develop/tests/e2e/tests/media-library). The specs of the legacy Media Library are in its `legacy/` folder.

Each spec gates its suite on the `E2E_MEDIA_LIBRARY` variable:

```ts
describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')('Asset details', () => {
  // ...
});
```

Legacy specs check for `'legacy'` instead. When the variable is not set, both suites are skipped. This keeps them out of the shared e2e matrix.

CI runs them in two jobs of [`.github/workflows/tests.yml`](https://github.com/strapi/strapi/blob/develop/.github/workflows/tests.yml):

| Job                        | Inputs                                                     | Runs                                          |
| -------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| `e2e_media_library`        | `mediaLibrarySuite: current`                               | The current Media Library specs               |
| `e2e_media_library_legacy` | `useLegacyMediaLibrary: true`, `mediaLibrarySuite: legacy` | The legacy specs, on the legacy Media Library |

The test app reads `USE_LEGACY_MEDIA_LIBRARY` in `tests/app-template/config/features.js` to serve the legacy Media Library. Both jobs run on Chromium only, because the drag and drop helper builds a `DataTransfer`, which WebKit does not implement.

### Run the suites locally

See the [e2e setup](../../../../contributing/03-testing/e2e/00-setup.md) for the runner. Scope the run to the `media-library` domain:

```bash
# Current Media Library
E2E_MEDIA_LIBRARY=current yarn test:e2e --domains=media-library -- asset-details.spec.ts --project=chromium

# Legacy Media Library
USE_LEGACY_MEDIA_LIBRARY=true E2E_MEDIA_LIBRARY=legacy yarn test:e2e --domains=media-library -- --project=chromium
```

Remove any `test.only` before you push.

### Page objects

- [`page-objects/AssetsPage.ts`](https://github.com/strapi/strapi/blob/develop/tests/e2e/tests/media-library/page-objects/AssetsPage.ts) covers the Media Library page. `page-objects/MediaField.ts` covers the `media` field. Add helpers there instead of writing selectors in specs.
- `assetsPage.assetDetailsDrawer` is the dialog that contains the "File info" heading. Start drawer queries from it.
- The close button in the drawer header and the close button of an in-drawer alert both have the accessible name "Close". Once an alert is visible, `getByRole('button', { name: 'Close' })` matches two elements and fails in strict mode, even inside the drawer locator. Scope the query to a unique ancestor, or assert on the drawer locator itself.
- Start waiting for the file chooser before the click that opens it. `replaceAssetFromDrawer` calls `page.waitForEvent('filechooser')` first, then clicks, then awaits the promise. If you wait after the click, the event can fire before the listener exists.
