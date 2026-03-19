import { TestEnvironment } from 'jest-environment-jsdom';

/* -------------------------------------------------------------------------------------------------
 * JSDOM env
 * -----------------------------------------------------------------------------------------------*/

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class CustomJSDOMEnvironment extends TestEnvironment {
  constructor(...args: ConstructorParameters<typeof TestEnvironment>) {
    super(...args);

    // TODO: remove once https://github.com/jsdom/jsdom/issues/3363 is closed.
    this.global.structuredClone = structuredClone;
  }
}
