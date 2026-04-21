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

// Non-enumerable slot on a Request instance holding the original stringified body. See
// the body-stash note in `setup()` below.
const BODY_STASH = Symbol('strapi.mswBodyStash');

type Stashed = Request & { [BODY_STASH]?: string };

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class CustomJSDOMEnvironment extends TestEnvironment {
  // Snapshot of jsdom's originals, captured in setup before overwrite. Restored in
  // teardown so a test that mutates one of these globals can't leak the mutation into
  // the next file sharing this Jest worker.
  private readonly originalGlobals = new Map<string, PropertyDescriptor | undefined>();

  private originalResponseJson: typeof Response.prototype.json | undefined;

  private originalRequestJson: typeof Request.prototype.json | undefined;

  private originalRequestText: typeof Request.prototype.text | undefined;

  async setup(): Promise<void> {
    await super.setup();

    for (const [name, value] of Object.entries(NODE_GLOBALS)) {
      this.originalGlobals.set(name, Object.getOwnPropertyDescriptor(this.global, name));
      (this.global as unknown as Record<string, unknown>)[name] = value;
    }

    // `Response` is Node-realm (undici). Its `.json()` uses Node's `JSON.parse`, so the
    // returned object/array have Node's `Object`/`Array` prototypes. In tests running
    // under jsdom, `instanceof Array`, `expect.any(Array)`, and `toStrictEqual` all
    // check against jsdom's prototypes and fail. Patch `Response.prototype.json` to
    // parse with jsdom-realm `JSON` so response bodies land in the right realm.
    const jsdomJSON = (this.global as unknown as { JSON: typeof JSON }).JSON;
    this.originalResponseJson = Response.prototype.json;
    Response.prototype.json = async function realmAgnosticJson() {
      const text = await this.text();
      return jsdomJSON.parse(text);
    };

    // MSW v2's `RequestHandler.run()` calls `request.clone()` *before* invoking the
    // resolver (to keep a copy around for post-hoc logging). Under Node's undici,
    // `Request.clone()` tees the underlying `ReadableStream`, which locks the original
    // body — so when the resolver then does `await request.json()`, undici throws
    // `TypeError: Body is unusable: Body has already been read`.
    //
    // Stash the stringified body on every `new Request(…)` and have `.json()` / `.text()`
    // return the stash when present. Handlers get what the test fired off regardless of
    // how many times msw clones the request internally.
    const GlobalRequest = (this.global as unknown as { Request: typeof Request }).Request;
    const NativeRequest = GlobalRequest;
    const PatchedRequest = function PatchedRequest(
      this: unknown,
      input?: RequestInfo | URL,
      init?: RequestInit
    ) {
      const request = Reflect.construct(NativeRequest, [input, init], PatchedRequest) as Stashed;
      if (init && typeof init.body === 'string') {
        Object.defineProperty(request, BODY_STASH, { value: init.body });
      } else if (input && typeof (input as Stashed)[BODY_STASH] === 'string') {
        Object.defineProperty(request, BODY_STASH, { value: (input as Stashed)[BODY_STASH] });
      }
      return request;
    } as unknown as typeof Request;
    PatchedRequest.prototype = NativeRequest.prototype;
    Object.setPrototypeOf(PatchedRequest, NativeRequest);
    (this.global as unknown as { Request: typeof Request }).Request = PatchedRequest;

    this.originalRequestText = Request.prototype.text;
    const nativeText = this.originalRequestText;
    Request.prototype.text = async function stashedText(this: Stashed) {
      const stashed = this[BODY_STASH];
      if (typeof stashed === 'string') return stashed;
      return nativeText.call(this);
    } as typeof Request.prototype.text;
    this.originalRequestJson = Request.prototype.json;
    Request.prototype.json = async function stashedJson(this: Stashed) {
      return jsdomJSON.parse(await this.text());
    };
  }

  async teardown(): Promise<void> {
    if (this.originalRequestJson) {
      Request.prototype.json = this.originalRequestJson;
      this.originalRequestJson = undefined;
    }
    if (this.originalRequestText) {
      Request.prototype.text = this.originalRequestText;
      this.originalRequestText = undefined;
    }
    if (this.originalResponseJson) {
      Response.prototype.json = this.originalResponseJson;
      this.originalResponseJson = undefined;
    }

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
