import type { Database, Event } from '@strapi/database';

import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

// Without strict types, `strapi.db` and lifecycle hooks keep develop's database types.
type BeforeCreate = NonNullable<Core.Lifecycles<'api::article.article'>['beforeCreate']>;
type AfterFindOne = NonNullable<Core.Lifecycles<'api::article.article'>['afterFindOne']>;
declare const lifecyclesChecks: [
  Expect<Equal<Core.Strapi['db'], Database>>,
  Expect<Equal<Parameters<BeforeCreate>[0], Event>>,
  Expect<Equal<ReturnType<BeforeCreate>, Promise<void> | void>>,
  Expect<Equal<Parameters<AfterFindOne>[0], Event>>,
  Expect<Equal<ReturnType<AfterFindOne>, Promise<void> | void>>,
];
lifecyclesChecks satisfies unknown;
