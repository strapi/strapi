import { TestEnvironment } from 'jest-environment-jsdom';

/* -------------------------------------------------------------------------------------------------
 * JSDOM env
 * -----------------------------------------------------------------------------------------------*/

// Node globals re-bound onto the jsdom realm. Single source of truth: the constructor
// installs every entry; teardown restores every entry.
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
  URL,
  URLSearchParams,
  BroadcastChannel,
} as const;

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class CustomJSDOMEnvironment extends TestEnvironment {
  // Snapshot of jsdom's original values, captured in setup before we overwrite them.
  // Restored in teardown so a test that mutates one of these globals can't leak
  // the mutation into the next file sharing this Jest worker.
  private readonly originalGlobals = new Map<string, PropertyDescriptor | undefined>();

  async setup(): Promise<void> {
    await super.setup();

    // Mirror `jest-fixed-jsdom`: jsdom omits or replaces several Node globals with
    // browser/DOM implementations that MSW v2's `@mswjs/interceptors` cannot construct
    // or patch. Re-bind to Node's native versions before any test code runs.
    // See: https://mswjs.io/docs/migrations/1.x-to-2.x#frequent-issues
    for (const [name, value] of Object.entries(NODE_GLOBALS)) {
      this.originalGlobals.set(name, Object.getOwnPropertyDescriptor(this.global, name));
      (this.global as unknown as Record<string, unknown>)[name] = value;
    }

    // Trade-off — `fetch`, `Request`, `Response`, `Headers` are Node's undici, not
    // jsdom's. MSW v2's `@mswjs/interceptors` patches the global `fetch` before
    // dispatching to handlers, so without Node's fetch the interceptor never installs
    // and requests escape to the real network. The cost: tests no longer exercise the
    // browser-fetch credential model (`credentials: 'include'` + `document.cookie`).
    // For Strapi this is fine — the admin reads/writes the JWT cookie via
    // `document.cookie` directly (`getFetchClient.ts`), so cookies are surfaced as
    // headers rather than picked up by the fetch credentials machinery. If a future
    // hook starts relying on automatic cookie propagation through `fetch`, it will
    // need a different test strategy (Playwright, real-browser msw).
    //
    // NOT polyfilled (vs `jest-fixed-jsdom`): `Blob`, `File`, `FormData`. These are
    // intentionally left as jsdom's implementations because Strapi's app code threads
    // them through DOM-only APIs that only accept the matching realm:
    //
    //   - `LogoInput.tsx` does `new FormData(htmlFormElement)`. Node's `FormData`
    //     (undici) doesn't accept HTMLFormElement; jsdom's does.
    //
    //   - `LogoInput.tsx` does `axios.get(url, { responseType: 'blob' })` then
    //     `new File([res.data], …)`. The `File` constructor only reads bytes from a
    //     `Blob` of its own realm — jsdom-File reading a Node-Blob falls back to
    //     `toString` ("[object Blob]" → size 13). Polyfilling `File` too "fixes" that
    //     chain but breaks the next: jsdom's `FileReader` / `Image` only accept
    //     jsdom-realm `File`/`Blob`.
    //
    // Net rule: polyfill what MSW v2's interceptor needs (fetch/streams/Request/
    // Response/Headers/AbortController/BroadcastChannel); leave alone what app code
    // hands off to jsdom-only APIs (Blob/File/FormData).
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
