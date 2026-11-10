import { hooks } from '@strapi/utils';

import type {
  AsyncParallelHook,
  AsyncSeriesHook,
  ContentTypesSyncContext,
  HookHandlers,
} from '../hook';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type LabContext = { label: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface Hooks {
        'plugin::hook-lab.created': AsyncParallelHook<LabContext>;
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const dynamicName: string;

// Registered hooks resolve to their contracts, including the hooks of the Strapi instance.
const beforeSync = strapi.hook('strapi::content-types.beforeSync');
const afterBootstrap = strapi.hook('strapi::app.afterBootstrap');
const created = strapi.hook('plugin::hook-lab.created');
// Unregistered names resolve to `unknown`: the runtime returns `undefined` when no hook is set.
const unregistered = strapi.hook('plugin::hook-lab.unregistered');
const dynamic = strapi.hook(dynamicName);
const registry = strapi.get('hooks');
declare const lookups: [
  Expect<Equal<typeof beforeSync, AsyncParallelHook<ContentTypesSyncContext>>>,
  Expect<Equal<typeof afterBootstrap, AsyncSeriesHook<void>>>,
  Expect<Equal<typeof created, AsyncParallelHook<LabContext>>>,
  Expect<Equal<typeof unregistered, unknown>>,
  Expect<Equal<typeof dynamic, unknown>>,
  Expect<Equal<StrapiInstance['hooks']['plugin::hook-lab.created'], AsyncParallelHook<LabContext>>>,
  Expect<Equal<StrapiInstance['hooks']['plugin::hook-lab.unregistered'], unknown>>,
  // The registry's `get` also returns `undefined` before the owner sets the hook.
  Expect<
    Equal<
      ReturnType<typeof registry.get<'plugin::hook-lab.created'>>,
      AsyncParallelHook<LabContext> | undefined
    >
  >,
  // An explicit type argument keeps the container's signature.
  Expect<Equal<ReturnType<typeof strapi.get<{ custom: true }>>, { custom: true }>>,
];
lookups satisfies unknown;

// An explicit type argument wins over the registries, including for unregistered names, as with
// `strapi.service<T>(uid)`. A registered literal without one still resolves to its contract.
type ExplicitHook = AsyncSeriesHook<{ explicit: true }>;
const explicitUnregistered = strapi.hook<ExplicitHook>('plugin::hook-lab.unregistered');
const explicitRegistered = strapi.hook<ExplicitHook>('plugin::hook-lab.created');
const explicitDynamic = strapi.hook<ExplicitHook>(dynamicName);
declare const explicitLookups: [
  Expect<Equal<typeof explicitUnregistered, ExplicitHook>>,
  Expect<Equal<typeof explicitRegistered, ExplicitHook>>,
  Expect<Equal<typeof explicitDynamic, ExplicitHook>>,
];
explicitLookups satisfies unknown;
// @ts-expect-error The type argument is never inferred from the expected type: it stays `unknown`.
const contextualHook: ExplicitHook = strapi.hook(dynamicName);
contextualHook satisfies unknown;

// Handlers receive the context the caller passes, and registration chains.
strapi
  .hook('strapi::content-types.afterSync')
  .register(({ oldContentTypes, contentTypes }) => {
    // @ts-expect-error The saved schemas are `undefined` or `null` before the first saved start.
    Object.keys(oldContentTypes);
    if (oldContentTypes !== undefined && oldContentTypes !== null) {
      Object.keys(oldContentTypes) satisfies string[];
    }
    Object.keys(contentTypes) satisfies string[];
  })
  .register(async () => {});
strapi
  .hook('strapi::content-types.beforeSync')
  // @ts-expect-error A handler cannot assume the saved schemas exist.
  .register((context: { oldContentTypes: Record<string, unknown> }) => context);
const chained = strapi.hook('plugin::hook-lab.created').register(() => {});
// @ts-expect-error Only the caller runs the hook: the chained value has no `call`.
chained.call({ label: 'x' });
// @ts-expect-error The registered context is checked.
strapi.hook('plugin::hook-lab.created').call({ name: 'x' });
strapi.hook('plugin::hook-lab.created').call({ label: 'x' });

// A registered hook can be replaced, but only by a hook of the same contract.
registry.set('plugin::hook-lab.created', hooks.createAsyncParallelHook());
declare const otherHook: AsyncParallelHook<{ other: number }>;
// @ts-expect-error The replacement must take the registered context.
registry.set('plugin::hook-lab.created', otherHook);
// @ts-expect-error The replacement must be a hook.
registry.set('strapi::content-types.beforeSync', {});
registry.extend('plugin::hook-lab.created', (hook) => ({
  ...hook,
  call: (context: LabContext) => hook.call({ label: context.label.trim() }),
}));
const otherCall = (context: { other: number }) => Promise.resolve([context]);
// @ts-expect-error The wrapper must keep the registered contract.
registry.extend('plugin::hook-lab.created', (hook) => ({ ...hook, call: otherCall }));
registry.add('plugin::hook-lab', { created: hooks.createAsyncParallelHook() });
// @ts-expect-error `add` checks registered UIDs too: `'plugin::hook-lab.created'`.
registry.add('plugin::hook-lab', { created: otherHook });
// @ts-expect-error `add` checks registered UIDs too: `'strapi::content-types.beforeSync'`.
registry.add('strapi::content-types', { beforeSync: otherHook });

// Unregistered names accept any hook, as at runtime.
registry.set('plugin::hook-lab.unregistered', otherHook);
registry.set(dynamicName, {});
registry.add('plugin::hook-lab', { unregistered: otherHook });
registry.keys() satisfies string[];

// Handler registration is shared by every hook kind.
({}) as AsyncParallelHook<LabContext> satisfies HookHandlers<LabContext>;
