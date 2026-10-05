import type { Global, Teardown } from './types';

/* -------------------------------------------------------------------------------------------------
 * Request body stash for msw v2 + undici
 *
 * The problem
 * -----------
 * MSW v2's `RequestHandler.run()` calls `request.clone()` BEFORE invoking the
 * resolver (to keep a copy around for post-hoc logging). Under Node's undici,
 * `Request.clone()` tees the underlying `ReadableStream`, which locks the
 * original body — so when the resolver then does `await request.json()`,
 * undici throws `TypeError: Body is unusable: Body has already been read`.
 *
 * The fix
 * -------
 * Stash the stringified body on every `new Request(…)` under a private Symbol,
 * and have `.text()` / `.json()` return the stash when present. Handlers get
 * what the test fired off regardless of how many times msw clones the request
 * internally. The stash is read-through: if an existing stashed Request is
 * passed as the first argument to `new Request(original, init)`, the stash
 * propagates to the new instance.
 *
 * Scope
 * -----
 * String and jsdom-realm `FormData` bodies are stashed. `Blob` / `ArrayBuffer`
 * bodies are not — extend with realm-aware handling (see node-globals.ts) if a
 * handler starts reading those shapes.
 * -----------------------------------------------------------------------------------------------*/

const BODY_STASH = Symbol('strapi.mswBodyStash');
const FORM_DATA_STASH = Symbol('strapi.mswFormDataStash');
const PATCH_MARKER = '__strapiStashedBody';

type Stashed = Request & {
  [BODY_STASH]?: string;
  [FORM_DATA_STASH]?: FormData;
};

type PatchedText = typeof Request.prototype.text & { [PATCH_MARKER]?: true };
type PatchedJson = typeof Request.prototype.json & { [PATCH_MARKER]?: true };
type PatchedFormData = typeof Request.prototype.formData & { [PATCH_MARKER]?: true };

/**
 * Extract the stashable representation of a Request body:
 *   - The explicit string body on `init.body`, if provided.
 *   - Otherwise the propagated stash from an existing Request passed as input.
 *   - `undefined` for anything else (non-string body, URL-only input, etc.).
 */
function stashStringFor(
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

function stashFormDataFor(
  input: RequestInfo | URL | undefined,
  init: RequestInit | undefined,
  RequestCtor: typeof Request,
  FormDataCtor: typeof FormData
): FormData | undefined {
  if (init?.body instanceof FormDataCtor) return init.body as FormData;
  if (input instanceof RequestCtor) {
    const inherited = (input as Stashed)[FORM_DATA_STASH];
    if (inherited) return inherited;
  }
  return undefined;
}

export function patchRequestBodyStash(global: Global): Teardown {
  const NativeRequest = global.Request as typeof Request;
  const jsdomJSON = global.JSON as typeof JSON;
  const FormDataCtor = global.FormData as typeof FormData;

  // Wrap the Request constructor via Proxy. Preserves `instanceof`, the
  // prototype chain, and static members automatically — no need to manually
  // reassign `prototype` or thread `Reflect.construct`'s `newTarget`.
  const PatchedRequest = new Proxy(NativeRequest, {
    construct(target, args) {
      const [input, init] = args as [RequestInfo | URL | undefined, RequestInit | undefined];
      const request = Reflect.construct(target, args) as Stashed;
      const body = stashStringFor(input, init, NativeRequest);
      const formData = stashFormDataFor(input, init, NativeRequest, FormDataCtor);
      if (body !== undefined) {
        Object.defineProperty(request, BODY_STASH, { value: body });
      }
      if (formData !== undefined) {
        Object.defineProperty(request, FORM_DATA_STASH, { value: formData });
      }
      return request;
    },
  });
  global.Request = PatchedRequest;

  const originalText = Request.prototype.text;
  const originalJson = Request.prototype.json;
  const originalFormData = Request.prototype.formData;

  if (
    (originalText as PatchedText)[PATCH_MARKER] ||
    (originalJson as PatchedJson)[PATCH_MARKER] ||
    (originalFormData as PatchedFormData)[PATCH_MARKER]
  ) {
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

  const patchedFormData: PatchedFormData = async function stashedFormData(this: Stashed) {
    const stashed = this[FORM_DATA_STASH];
    if (stashed) return stashed;
    return originalFormData.call(this);
  };
  patchedFormData[PATCH_MARKER] = true;
  Request.prototype.formData = patchedFormData;

  return function teardownRequestBodyStash() {
    global.Request = NativeRequest;
    Request.prototype.text = originalText;
    Request.prototype.json = originalJson;
    Request.prototype.formData = originalFormData;
  };
}
