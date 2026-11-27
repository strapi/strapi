import type { Core } from '../../src';
import type { Expect } from './helpers';

// The application's `src/index` module keeps develop's `any` without strict types.
type IsAny<T> = 0 extends 1 & T ? true : false;
declare const instanceChecks: [Expect<IsAny<Core.Strapi['app']>>];
instanceChecks satisfies unknown;
