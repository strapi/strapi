/* -------------------------------------------------------------------------------------------------
 * FormData realm bridge for jsdom + undici + msw v2
 *
 * The problem
 * -----------
 * `applyNodeGlobals` intentionally keeps jsdom's `FormData`/`Blob`/`File` on
 * the global (see node-globals.ts for the rationale). App code therefore builds
 * a *jsdom-realm* `FormData` and passes it to `getFetchClient.post(…)`, which
 * deletes the `Content-Type` header and forwards the body straight to the
 * global `Request` constructor (undici). undici does not recognise a
 * foreign-realm `FormData` (it fails its internal `instanceof FormData` guard),
 * so it falls back to `.toString()` and sends the body as the string
 * `"[object FormData]"` with `Content-Type: text/plain`.
 *
 * Consequences:
 *   1. Tests that inspect the wire content-type see `text/plain` instead of
 *      `multipart/form-data`.
 *   2. msw handlers that call `await request.formData()` cannot parse the body.
 *   3. The msw response never resolves → mutations error ("Failed to update the
 *      file." toast) → `captured` stays `null` → test assertions fail.
 *
 * The fix
 * -------
 * This module exports `bridgeFormDataBody`, a helper used inside the Request
 * constructor Proxy in `patchRequestBodyStash`. When a `new Request(url, init)`
 * call carries a jsdom-realm `FormData` in `init.body`, the Proxy calls
 * `bridgeFormDataBody` to convert it to a Node/undici `FormData` (string
 * fields only, synchronously) before passing the args to the native Request
 * constructor. undici then serialises the Node-realm `FormData` correctly and
 * emits a proper `multipart/form-data` body.
 *
 * Why patch `Request` construction rather than `fetch`
 * ----------------------------------------------------
 * msw v2 (`FetchInterceptor`) wraps `globalThis.fetch` and internally constructs
 * a `new FetchRequest(input, init)` where `FetchRequest extends Request`. By the
 * time our patched `fetch` wrapper would run, msw has already consumed the body
 * via that FetchRequest construction. Patching the `Request` constructor (which
 * `FetchRequest` inherits) intercepts the body before undici touches it.
 *
 * Why wrap `Request` rather than replacing `FormData`
 * ---------------------------------------------------
 * Replacing the global `FormData` with undici's version breaks:
 *   - `new FormData(htmlFormElement)` (jsdom-only API used by LogoInput).
 *   - jsdom `FileReader` / `Image` / `URL.createObjectURL` (realm-sensitive).
 * See node-globals.ts for full rationale.
 *
 * Scope / edge cases
 * ------------------
 * Only string-valued FormData entries are bridged synchronously. `File`/`Blob`
 * entries require async (`arrayBuffer()`) and are not covered here — no current
 * handler in the repo calls `request.formData()` on a body that contains files.
 * TODO @Nico: widen bridgeFormDataBody to async-bridge File/Blob entries if a
 *             file-upload handler needs `request.formData()` in the future.
 * -----------------------------------------------------------------------------------------------*/

/**
 * Captured at module load time, BEFORE jest-environment-jsdom has a chance to
 * shadow the globals. At this point `FormData`/`Blob`/`File` are the Node/undici
 * versions — identical to what `applyNodeGlobals` captures for fetch/Request.
 */
const NodeFormData = FormData;
const NodeBlob = Blob;
const NodeFile = File;

/**
 * Returns `true` when `value` is a `FormData`-shaped object from a *different*
 * realm than the Node/undici `FormData` captured above (e.g. jsdom's FormData).
 *
 * We cannot use `value instanceof FormData` here because at module scope
 * `FormData` IS `NodeFormData` — a jsdom FormData instance is NOT
 * `instanceof NodeFormData`. We detect it via duck-typing + realm check.
 */
type FormDataShaped = { entries: unknown; append: unknown; get: unknown };

export function isForeignFormData(value: unknown): value is FormData {
  if (value instanceof NodeFormData) return false;
  if (value === null || typeof value !== 'object') return false;
  const shaped = value as FormDataShaped;
  return (
    typeof shaped.entries === 'function' &&
    typeof shaped.append === 'function' &&
    typeof shaped.get === 'function'
  );
}

/**
 * Synchronously converts a jsdom-realm `FormData` into a Node/undici `FormData`
 * that undici can serialise as a proper `multipart/form-data` body.
 *
 * - String entries: copied verbatim.
 * - File/Blob entries: converted to a Node File/Blob with the same MIME type
 *   and filename but **placeholder bytes** (the jsdom Blob byte content is only
 *   accessible via async `arrayBuffer()` which cannot be called here). The
 *   placeholder approach is sufficient for tests that inspect the content-type
 *   header or the presence/absence of the body — it is NOT suitable for tests
 *   that parse the multipart payload and read the actual file bytes.
 *
 * TODO @Nico: async-bridge the actual file bytes for tests that call
 *             `request.formData()` on a body containing uploaded files.
 *             The Request constructor Proxy that calls this function is sync, so
 *             that requires a different interception point (e.g. a fetch wrapper
 *             that runs before msw's FetchInterceptor installs — which means
 *             wiring it into `beforeAll` via a helper rather than the environment
 *             setup phase).
 */
export function bridgeFormDataBody(jsdomFD: FormData): InstanceType<typeof NodeFormData> {
  const nodeFD = new NodeFormData();

  for (const [name, value] of jsdomFD.entries()) {
    if (typeof value === 'string') {
      nodeFD.append(name, value);
    } else {
      // value is a jsdom-realm File (subclass of jsdom Blob).
      // We cannot read the bytes synchronously so we create a Node File with
      // placeholder bytes. The MIME type and filename are preserved so undici
      // emits the correct multipart boundary and part headers.
      const filename = value instanceof File ? value.name : 'blob';
      const nodeFile = new NodeFile([], filename, { type: value.type });
      nodeFD.append(name, nodeFile, filename);
    }
  }

  return nodeFD;
}

// Re-export the captured Node constructors so patchRequestBodyStash can use them
// without duplicating the module-load-time capture logic.
export { NodeFormData, NodeBlob, NodeFile };

// This module is a helper library for `patchRequestBodyStash`. It does not
// install any global patches itself. All wiring lives in `patchRequestBodyStash`.
