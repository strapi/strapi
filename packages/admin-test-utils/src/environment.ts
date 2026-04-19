import { TestEnvironment } from 'jest-environment-jsdom';

/* -------------------------------------------------------------------------------------------------
 * JSDOM env
 * -----------------------------------------------------------------------------------------------*/

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class CustomJSDOMEnvironment extends TestEnvironment {
  constructor(...args: ConstructorParameters<typeof TestEnvironment>) {
    super(...args);

    // Mirror `jest-fixed-jsdom`: jsdom omits or replaces several Node globals with
    // browser/DOM implementations that MSW v2's `@mswjs/interceptors` cannot construct
    // or patch. Re-bind to Node's native versions before any test code runs.
    // See: https://mswjs.io/docs/migrations/1.x-to-2.x#frequent-issues
    this.global.TextDecoder = TextDecoder;
    this.global.TextEncoder = TextEncoder;
    this.global.TextDecoderStream = TextDecoderStream;
    this.global.TextEncoderStream = TextEncoderStream;
    this.global.ReadableStream = ReadableStream;
    this.global.TransformStream = TransformStream;
    this.global.WritableStream = WritableStream;

    this.global.Headers = Headers;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.fetch = fetch;
    this.global.AbortController = AbortController;
    this.global.AbortSignal = AbortSignal;
    this.global.structuredClone = structuredClone;
    this.global.URL = URL;
    this.global.URLSearchParams = URLSearchParams;
    this.global.BroadcastChannel = BroadcastChannel;

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
}
