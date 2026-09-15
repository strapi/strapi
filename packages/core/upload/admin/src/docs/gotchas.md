# Gotchas

Stuff that's silently wrong, not obviously wrong.

## cropperjs needs its stylesheet injected

`new Cropper(...)` builds its DOM but relies on `cropperjs/dist/cropper.css`
for layout. Without it the cropper container collapses and the editor body
renders blank (no image, no crop box). Vite has no global CSS auto-import
here, so load it as a raw string + `createGlobalStyle`, matching the legacy
`EditAssetDialog/PreviewBox`:

```tsx
import cropperCss from 'cropperjs/dist/cropper.css?raw';
const CropperGlobalStyle = createGlobalStyle`${cropperCss}`;
// ...render <CropperGlobalStyle /> inside the editor
```

Unit tests that pull in the editor must stub the `?raw` module:

```ts
jest.mock('cropperjs/dist/cropper.css?raw', () => '', { virtual: true });
```

## `File` type collision

`File` from `@strapi/types/contracts/upload` clashes with the browser's
global `File`. Service files import the contract type by default, so any
mutation that takes a browser file needs:

```ts
type ReplaceAssetArgs = {
  id: number;
  file: globalThis.File;
};
```

Without the `globalThis.` prefix, the contract type wins by import order
and TypeScript complains about missing properties on `File` when you build
the FormData.

The decision site in `services/assets.ts` has a one-line comment pointing
here.

## Stale msw

The lockfile is on msw 2.x, but `yarn install` sometimes leaves a stale
1.3.0 in `node_modules` after a branch switch. Symptoms: tests using
`http.get(...)` fail to resolve `http` from `msw`, or v1 `rest`
handlers don't intercept.

Fix:

```
yarn install
nx reset
yarn workspace @strapi/admin-test-utils build
```

Then re-run the test.

## `await request.formData()` hangs in jsdom

Asserting on the body of a `multipart/form-data` request that contains a
real `File` blob will hang the test. Assert on metadata (id, headers,
presence of body) instead.

```ts
http.put('/upload/:id', async ({ request, params }) => {
  // Don't await request.formData() — it hangs.
  expect(request.headers.get('content-type')).toMatch(/multipart\/form-data/);
  return HttpResponse.json({ data: { id: Number(params.id) } });
});
```

## Strict-mode locators in Playwright

Inside the drawer, `getByRole('button', { name: 'Close' })` matches two
nodes once the in-drawer Alert is rendered (drawer X + Alert close). Use
the drawer locator's own visibility, or scope the query to a unique
ancestor.

## Drawer z-index

Drawer is literal `200`, not `theme.zIndices.dialog`. See
[drawer.md](drawer.md) for why. If a popover, select, or dialog inside
the drawer is invisible, this is the first thing to check.

## URL param + Back button

If the drawer opens but Back doesn't return to the previous page, the
URL update is using `push` instead of `replace`. See [drawer.md](drawer.md).
