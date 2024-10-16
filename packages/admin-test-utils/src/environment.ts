import JSDOMEnvironment from 'jest-environment-jsdom';

/* -------------------------------------------------------------------------------------------------
 * JSDOM env
 * -----------------------------------------------------------------------------------------------*/

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class CustomJSDOMEnvironment extends JSDOMEnvironment {
  constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>) {
    super(...args);

    // TODO: remove once https://github.com/jsdom/jsdom/issues/3363 is closed.
    this.global.structuredClone = structuredClone;

    // fixing these global APIs according to https://github.com/mswjs/jest-fixed-jsdom/blob/main/index.js
    this.global.TextDecoder = TextDecoder;
    this.global.TextEncoder = TextEncoder;
    this.global.ReadableStream = ReadableStream;

    this.global.Blob = Blob;
    this.global.Headers = Headers;
    this.global.FormData = FormData;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.fetch = fetch;

    this.global.URL = URL;
  }
}
