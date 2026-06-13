import { isForeignFormData, bridgeFormDataBody } from './request-formdata-realm';
import type { Global, Teardown } from './types';

/* -------------------------------------------------------------------------------------------------
 * Request body stash + FormData realm bridge for msw v2 + undici
 *
 * Problem 1: Body unusable (clone/tee lock)
 * -----------------------------------------
 * MSW v2's `RequestHandler.run()` calls `request.clone()` BEFORE invoking the
 * resolver (to keep a copy around for post-hoc logging). Under Node's undici,
 * `Request.clone()` tees the underlying `ReadableStream`, which locks the
 * original body — so when the resolver then does `await request.json()`,
 * undici throws `TypeError: Body is unusable: Body has already been read`.
 *
 * Fix: Stash the stringified body on every `new Request(…)` under a private
 * Symbol, and have `.text()` / `.json()` return the stash when present.
 * Handlers get what the test fired off regardless of how many times msw clones
 * the request internally. The stash is read-through: if an existing stashed
 * Request is passed as the first argument to `new Request(original, init)`, the
 * stash propagates to the new instance.
 *
 * Problem 2: jsdom-realm FormData → "text/plain" coercion
 * --------------------------------------------------------
 * `applyNodeGlobals` keeps jsdom's `FormData` on the global (see node-globals.ts
 * for the rationale). App code builds a jsdom-realm `FormData` and passes it to
 * `getFetchClient.post(…)`. msw v2's `FetchInterceptor` constructs a
 * `new FetchRequest(input, init)` (where `FetchRequest extends Request`) from
 * the original `fetch()` arguments. undici's `Request` constructor does not
 * recognise a foreign-realm `FormData` and calls `.toString()` on it, producing
 * the string `"[object FormData]"` with `Content-Type: text/plain`.
 *
 * Fix: In the same Request constructor Proxy (problem 1's fix), detect a
 * jsdom-realm `FormData` in `init.body` and replace it with a Node/undici
 * `FormData` **before** calling `Reflect.construct`. Only string-valued entries
 * are bridged synchronously; see `request-formdata-realm.ts` for the rationale
 * and the TODO for File/Blob entries.
 *
 * Why the Request constructor proxy, not a fetch wrapper
 * -------------------------------------------------------
 * msw's `FetchInterceptor` wraps `globalThis.fetch` and constructs a
 * `FetchRequest` from the call arguments immediately. By the time a patched
 * outer `fetch` wrapper would run, msw has already consumed the body through
 * that construction. Intercepting the `Request` constructor (which `FetchRequest`
 * inherits) is the earliest point where we can replace the body.
 *
 * Scope / stash
 * -------------
 * Only string bodies and bridged FormData bodies are handled here. `Blob` /
 * `ArrayBuffer` bodies are not stashed — no current handler reads those shapes.
 * -----------------------------------------------------------------------------------------------*/

const BODY_STASH = Symbol('strapi.mswBodyStash');
const PATCH_MARKER = '__strapiStashedBody';

type Stashed = Request & { [BODY_STASH]?: string };

type PatchedText = typeof Request.prototype.text & { [PATCH_MARKER]?: true };
type PatchedJson = typeof Request.prototype.json & { [PATCH_MARKER]?: true };

/**
 * Extract the stashable representation of a Request body:
 *   - The explicit string body on `init.body`, if provided.
 *   - Otherwise the propagated stash from an existing Request passed as input.
 *   - `undefined` for anything else (non-string body, URL-only input, etc.).
 */
function stashFor(
  input: RequestInfo | URL | undefined,
  init: RequestInit | undefined,
  RequestCtor: typeof Request
): string | undefined {
  if (init && typeof init.body === 'string') return init.body;
  if (input instanceof RequestCtor) {
    const inherited = (input as Stashed)[BODY_STASH];
    if (typeof inherited === 'string') return inherited;
  }
  return undefined;
}

/**
 * If `init.body` is a jsdom-realm `FormData`, bridge it to a Node/undici
 * `FormData` synchronously and return a new `init` with the replaced body.
 * Returns the original `init` unchanged if no bridging is needed.
 */
function bridgeInit(init: RequestInit | undefined): RequestInit | undefined {
  if (init !== undefined && isForeignFormData(init.body)) {
    return { ...init, body: bridgeFormDataBody(init.body) };
  }
  return init;
}

export function patchRequestBodyStash(global: Global): Teardown {
  const NativeRequest = global.Request as typeof Request;
  const jsdomJSON = global.JSON as typeof JSON;

  // Wrap the Request constructor via Proxy. Preserves `instanceof`, the
  // prototype chain, and static members automatically — no need to manually
  // reassign `prototype` or thread `Reflect.construct`'s `newTarget`.
  const PatchedRequest = new Proxy(NativeRequest, {
    construct(target, args) {
      const [input, init] = args as [RequestInfo | URL | undefined, RequestInit | undefined];
      const bridgedInit = bridgeInit(init);
      const bridgedArgs = bridgedInit !== init ? [input, bridgedInit] : args;
      const request = Reflect.construct(target, bridgedArgs) as Stashed;
      const body = stashFor(input, init, NativeRequest);
      if (body !== undefined) {
        Object.defineProperty(request, BODY_STASH, { value: body });
      }
      return request;
    },
  });
  global.Request = PatchedRequest;

  const originalText = Request.prototype.text;
  const originalJson = Request.prototype.json;

  if ((originalText as PatchedText)[PATCH_MARKER] || (originalJson as PatchedJson)[PATCH_MARKER]) {
    throw new Error(
      '@strapi/admin-test-utils: patchRequestBodyStash was applied without a ' +
        'matching teardown. setup() was likely called twice in the same worker.'
    );
  }

  const patchedText: PatchedText = async function stashedText(this: Stashed) {
    const stashed = this[BODY_STASH];
    if (typeof stashed === 'string') return stashed;
    return originalText.call(this);
  };
  patchedText[PATCH_MARKER] = true;
  Request.prototype.text = patchedText;

  const patchedJson: PatchedJson = async function stashedJson(this: Stashed) {
    return jsdomJSON.parse(await this.text());
  };
  patchedJson[PATCH_MARKER] = true;
  Request.prototype.json = patchedJson;

  return function teardownRequestBodyStash() {
    global.Request = NativeRequest;
    Request.prototype.text = originalText;
    Request.prototype.json = originalJson;
  };
}
