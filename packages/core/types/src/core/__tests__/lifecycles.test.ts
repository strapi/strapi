import type { Database } from '@strapi/database';

import type * as Data from '../../data';
import type * as Lifecycles from '../../modules/lifecycles';
import type { Lifecycles as CoreLifecycles } from '../lifecycles';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

// This program registers no content type: lifecycles of an unregistered model receive `AnyEvent`.
type AfterCreate = NonNullable<CoreLifecycles<'api::lifecycle-lab.lab'>['afterCreate']>;

declare const lifecycleChecks: [
  Expect<Equal<Lifecycles.Query<'beforeCreate'>, 'create'>>,
  Expect<Equal<Lifecycles.Query<'afterDeleteMany'>, 'deleteMany'>>,
  Expect<Equal<Parameters<AfterCreate>[0], Lifecycles.AnyEvent<'afterCreate'>>>,
  // The runtime awaits a hook and ignores its result.
  Expect<Equal<ReturnType<AfterCreate>, unknown>>,
  Expect<Equal<Lifecycles.ModelEvent<string, 'afterCount'>, Lifecycles.AnyEvent<'afterCount'>>>,
  Expect<Equal<Lifecycles.ModelEvent<never, 'afterCount'>, Lifecycles.AnyEvent<'afterCount'>>>,
  Expect<Equal<Lifecycles.AnyEvent<'afterCount'>['result'], number>>,
];
lifecycleChecks satisfies unknown;

// `AnyEvent` is a union of the actions' events, narrowed by `event.action`.
export const everyModel: Lifecycles.SubscriberFn = (event) => {
  if (event.action === 'afterFindOne') {
    event.result satisfies Record<string, unknown> | null;
  }
  if (event.action === 'beforeUpdate') {
    // @ts-expect-error `before*` events have no result.
    event.result satisfies unknown;
    // `data` is checked by the query after `before*`: it may be missing.
    event.params.data satisfies Record<string, unknown> | undefined;
  }
};

// With strict types, `strapi.db` types `lifecycles.subscribe` and stays a `Database` for the code
// that takes one.
declare const strapi: StrapiInstance;

declare const dbChecks: [
  Expect<Equal<StrapiInstance['db'], Lifecycles.StrictDatabase>>,
  Expect<Equal<StrapiInstance['db'] extends Database ? true : false, true>>,
  Expect<Equal<ReturnType<StrapiInstance['db']['lifecycles']['subscribe']>, () => void>>,
];
dbChecks satisfies unknown;

// A function subscriber receives every event of every model: a union narrowed by `action`.
strapi.db.lifecycles.subscribe((event) => {
  if (event.action === 'afterCount') {
    event.result satisfies number;
  }
  if (event.action === 'beforeCreate') {
    // @ts-expect-error `before*` events have no result.
    event.result satisfies unknown;
  }
});

// Dynamic models receive records of unknown values.
declare const models: string[];
strapi.db.lifecycles.subscribe({
  models,
  afterFindOne(event) {
    event.result satisfies Record<string, unknown> | null;
    event.model.uid satisfies string;
  },
});

// So do models without a registered schema. An unknown hook name is an excess property.
strapi.db.lifecycles.subscribe({
  models: ['api::lifecycle-lab.lab'],
  afterCreateMany(event) {
    event.result satisfies { count: number; ids: Data.ID[] };
  },
  // @ts-expect-error `afterSave` is not a lifecycle action.
  afterSave() {},
});
