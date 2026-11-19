import type * as Lifecycles from '../../modules/lifecycles';
import type { Lifecycles as CoreLifecycles } from '../lifecycles';
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
