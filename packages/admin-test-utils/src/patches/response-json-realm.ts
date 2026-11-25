import type { Global, Teardown } from './types';

/* -------------------------------------------------------------------------------------------------
 * Response.prototype.json → jsdom realm
 *
 * Once `applyNodeGlobals` has bound undici's `Response` onto the jsdom global,
 * `Response.prototype.json()` parses with Node's `JSON`. The returned value has
 * Node's `Object` / `Array` prototypes. Tests running under jsdom check against
 * jsdom's prototypes, so `instanceof Array`, `expect.any(Array)`, and
 * `toStrictEqual` all fail with confusing "objects look equal but aren't"
 * errors.
 *
 * Patch `Response.prototype.json` to parse with jsdom-realm `JSON` so response
 * bodies land in the right realm. The patch is idempotent-guarded — if it's
 * applied twice without a teardown in between, the second call throws rather
 * than silently stacking.
 * -----------------------------------------------------------------------------------------------*/

const PATCH_MARKER = '__strapiRealmAgnosticJson';

type PatchedJson = typeof Response.prototype.json & { [PATCH_MARKER]?: true };

export function patchResponseJsonRealm(global: Global): Teardown {
  const jsdomJSON = global.JSON as typeof JSON;
  const original = Response.prototype.json;

  if ((original as PatchedJson)[PATCH_MARKER]) {
    throw new Error(
      '@strapi/admin-test-utils: patchResponseJsonRealm was applied without a ' +
        'matching teardown. setup() was likely called twice in the same worker.'
    );
  }

  const patched: PatchedJson = async function realmAgnosticJson(this: Response) {
    const text = await this.text();
    return jsdomJSON.parse(text);
  };
  patched[PATCH_MARKER] = true;
  Response.prototype.json = patched;

  return function teardownResponseJsonRealm() {
    Response.prototype.json = original;
  };
}
