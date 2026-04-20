import { TestEnvironment } from 'jest-environment-jsdom';

/* -------------------------------------------------------------------------------------------------
 * JSDOM env
 *
 * Mirrors `jest-fixed-jsdom`: jsdom omits or replaces several Node globals with browser/DOM
 * implementations that MSW v2's `@mswjs/interceptors` cannot construct or patch. Re-bind to
 * Node's native versions before any test code runs.
 * See: https://mswjs.io/docs/migrations/1.x-to-2.x#frequent-issues
 *
 * Polyfill scope is deliberately narrower than `jest-fixed-jsdom`:
 *
 *   - `fetch` / `Request` / `Response` / `Headers` — REQUIRED. MSW v2's interceptor patches
 *     the global `fetch` before dispatching to handlers; without Node's `fetch` the
 *     interceptor never installs and requests escape to the real network. Cost: tests no
 *     longer exercise the browser-fetch credential model (`credentials: 'include'` +
 *     `document.cookie`). Fine for Strapi — the admin reads/writes the JWT cookie via
 *     `document.cookie` directly (`getFetchClient.ts`) and surfaces it as an `Authorization`
 *     header, rather than relying on automatic cookie propagation through `fetch`. A future
 *     hook that does rely on it would need a different test strategy (Playwright, real-
 *     browser msw).
 *
 *   - `Blob` / `File` / `FormData` — NOT polyfilled. Strapi app code threads these through
 *     jsdom-only APIs that only accept the matching realm:
 *       * `LogoInput.tsx` does `new FormData(htmlFormElement)`. Node's `FormData` (undici)
 *         doesn't accept HTMLFormElement; jsdom's does.
 *       * `LogoInput.tsx` does `axios.get(url, { responseType: 'blob' })` then
 *         `new File([res.data], …)`. The `File` constructor only reads bytes from a `Blob`
 *         of its own realm — jsdom-File reading a Node-Blob falls back to `toString`
 *         (`"[object Blob]"` → size 13). Polyfilling `File` too "fixes" that chain but
 *         breaks the next: jsdom's `FileReader` / `Image` only accept jsdom-realm
 *         `File`/`Blob`.
 *
 *   - `URL` / `URLSearchParams` — NOT polyfilled. jsdom already provides browser-spec
 *     versions, and Node's `URL.createObjectURL` only accepts Node-realm `Blob` —
 *     replacing it breaks jsdom's `File` → `URL.createObjectURL` flow used by
 *     `LogoInput.tsx` ("from computer" upload path). MSW v2's interceptor doesn't require
 *     these to come from Node.
 *
 * Net rule: polyfill what MSW v2's interceptor needs (fetch/streams/Request/Response/
 * Headers/AbortController/BroadcastChannel); leave alone what app code hands off to
 * jsdom-only APIs (Blob/File/FormData/URL).
 * -----------------------------------------------------------------------------------------------*/

const NODE_GLOBALS = {
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
  structuredClone,
  BroadcastChannel,
} as const;

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class CustomJSDOMEnvironment extends TestEnvironment {
  // Snapshot of jsdom's originals, captured in setup before overwrite. Restored in
  // teardown so a test that mutates one of these globals can't leak the mutation into
  // the next file sharing this Jest worker.
  private readonly originalGlobals = new Map<string, PropertyDescriptor | undefined>();

  async setup(): Promise<void> {
    await super.setup();

    for (const [name, value] of Object.entries(NODE_GLOBALS)) {
      this.originalGlobals.set(name, Object.getOwnPropertyDescriptor(this.global, name));
      (this.global as unknown as Record<string, unknown>)[name] = value;
    }
  }

  async teardown(): Promise<void> {
    for (const [name, descriptor] of this.originalGlobals) {
      if (descriptor) {
        Object.defineProperty(this.global, name, descriptor);
      } else {
        delete (this.global as unknown as Record<string, unknown>)[name];
      }
    }
    this.originalGlobals.clear();

    await super.teardown();
  }
}
