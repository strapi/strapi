import type { Global, Teardown } from './types';

/* -------------------------------------------------------------------------------------------------
 * Node globals → jsdom global
 *
 * jsdom omits or replaces several Node globals with browser/DOM implementations
 * that MSW v2's `@mswjs/interceptors` cannot construct or patch. Re-bind Node's
 * native versions onto `env.global` before any test code runs. The snapshot of
 * jsdom's originals (captured per-patch-instance, not at module scope) is
 * restored in teardown, so a test that mutates one of these globals cannot leak
 * the mutation into the next file sharing the same Jest worker.
 *
 * Mirrors the `jest-fixed-jsdom` package, but with a deliberately narrower scope:
 *
 *   - `fetch` / `Request` / `Response` / `Headers` — REQUIRED. MSW v2's
 *     interceptor patches the global `fetch` before dispatching to handlers;
 *     without Node's `fetch` the interceptor never installs and requests escape
 *     to the real network. Cost: tests no longer exercise the browser-fetch
 *     credential model (`credentials: 'include'` + `document.cookie`). Fine for
 *     Strapi — the admin reads/writes the JWT cookie via `document.cookie`
 *     directly (`getFetchClient.ts`) and surfaces it as an `Authorization`
 *     header, rather than relying on automatic cookie propagation through
 *     `fetch`. A future hook that does rely on it would need a different test
 *     strategy (Playwright, real-browser msw).
 *
 *   - `Blob` / `File` / `FormData` — NOT polyfilled. Strapi app code threads
 *     these through jsdom-only APIs that only accept the matching realm:
 *       * `LogoInput.tsx` does `new FormData(htmlFormElement)`. Node's
 *         `FormData` (undici) doesn't accept HTMLFormElement; jsdom's does.
 *       * `LogoInput.tsx` does `axios.get(url, { responseType: 'blob' })` then
 *         `new File([res.data], …)`. The `File` constructor only reads bytes
 *         from a `Blob` of its own realm — jsdom-File reading a Node-Blob
 *         falls back to `toString` (`"[object Blob]"` → size 13).
 *         Polyfilling `File` too "fixes" that chain but breaks the next:
 *         jsdom's `FileReader` / `Image` only accept jsdom-realm `File`/`Blob`.
 *
 *   - `URL` / `URLSearchParams` — NOT polyfilled. jsdom already provides
 *     browser-spec versions, and Node's `URL.createObjectURL` only accepts
 *     Node-realm `Blob` — replacing it breaks jsdom's `File` →
 *     `URL.createObjectURL` flow used by `LogoInput.tsx` ("from computer"
 *     upload path). MSW v2's interceptor doesn't require these to come from
 *     Node.
 *
 * Net rule: polyfill what MSW v2's interceptor needs (fetch/streams/Request/
 * Response/Headers/AbortController/BroadcastChannel); leave alone what app
 * code hands off to jsdom-only APIs (Blob/File/FormData/URL).
 *
 * The other half of the msw/node puzzle lives in `jest-preset.front.js` as
 * `testEnvironmentOptions.customExportConditions: ['']` — both halves are
 * required for `msw/node` to resolve under jsdom.
 * -----------------------------------------------------------------------------------------------*/

/**
 * Captured at module load, BEFORE `jest-environment-jsdom` has a chance to set
 * up and shadow these with jsdom's equivalents. Frozen so a patch author can't
 * accidentally reassign and drift.
 */
const NODE_GLOBALS = Object.freeze({
  TextDecoder,
  TextEncoder,
  TextDecoderStream,
  TextEncoderStream,
  ReadableStream,
  TransformStream,
  WritableStream,
  Headers,
  Request,
  Response,
  fetch,
  AbortController,
  AbortSignal,
  structuredClone: globalThis.structuredClone,
  BroadcastChannel,
} as const);

export function applyNodeGlobals(global: Global): Teardown {
  const originals = new Map<string, PropertyDescriptor | undefined>();

  for (const [name, value] of Object.entries(NODE_GLOBALS)) {
    originals.set(name, Object.getOwnPropertyDescriptor(global, name));
    global[name] = value;
  }

  return function teardownNodeGlobals() {
    for (const [name, descriptor] of originals) {
      if (descriptor) {
        Object.defineProperty(global, name, descriptor);
      } else {
        delete global[name];
      }
    }
    originals.clear();
  };
}
