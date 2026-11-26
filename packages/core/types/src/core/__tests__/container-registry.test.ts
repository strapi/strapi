import type { Database } from '@strapi/database';
import type * as Modules from '../../modules';

import type { ContainerFor, ContainerLookupName, ContainerResolver } from '../container';
import type { ContentTypesRegistry, QueryParamsService } from '../container-contracts';
import type { StrictHooksRegistry } from '../hook';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type Greeter = { greet(name: string): string };
type Formatter = (value: string) => string;

// An application, or a plugin, registers the names it adds to the container.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface ContainerEntries {
        'container-lab.greeter': Greeter;
        'container-lab.formatter': Formatter;
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const dynamicName: string;

// Registered names resolve to the value `get` returns: the value given to `add`, or what its
// factory returns.
const webhookStore = strapi.get('webhookStore');
const queryParams = strapi.get('query-params');
const contentTypes = strapi.get('content-types');
const auditLogsLifecycle = strapi.get('audit-logs-lifecycle');
const hooksRegistry = strapi.get('hooks');
const greeter = strapi.get('container-lab.greeter');
const withArgs = strapi.get('container-lab.greeter', { locale: 'en' });
declare const registered: [
  Expect<Equal<typeof webhookStore, Modules.WebhookStore.WebhookStore>>,
  Expect<Equal<typeof queryParams, QueryParamsService>>,
  Expect<Equal<typeof contentTypes, ContentTypesRegistry>>,
  Expect<Equal<typeof auditLogsLifecycle, Modules.AuditLogs.AuditLogsLifecycleService>>,
  // The strict view, as `strapi.hooks` and `strapi.hook(uid)` read it.
  Expect<Equal<typeof hooksRegistry, StrictHooksRegistry>>,
  Expect<Equal<typeof greeter, Greeter>>,
  Expect<Equal<typeof withArgs, Greeter>>,
];
registered satisfies unknown;

// The names the `strapi.*` getters read resolve to what the getter returns, strict views included
// (`eventHub`, `coreStore`, `db`, `admin`).
type GetterNames = {
  admin: 'admin';
  ai: 'ai';
  auth: 'auth';
  config: 'config';
  contentAPI: 'content-api';
  contentAPISchemaRegistry: 'content-api-schema-registry';
  cron: 'cron';
  customFields: 'customFields';
  db: 'db';
  documents: 'documents';
  entityService: 'entityService';
  entityValidator: 'entityValidator';
  eventHub: 'eventHub';
  features: 'features';
  fetch: 'fetch';
  fs: 'fs';
  localization: 'localization';
  log: 'logger';
  reload: 'reload';
  requestContext: 'requestContext';
  sanitizers: 'sanitizers';
  server: 'server';
  sessionManager: 'sessionManager';
  startupLogger: 'startupLogger';
  store: 'coreStore';
  telemetry: 'telemetry';
  validators: 'validators';
};
type GetterMismatch = {
  [TGetter in keyof GetterNames]: Equal<
    StrapiInstance[TGetter],
    ContainerFor<GetterNames[TGetter]>
  > extends true
    ? never
    : TGetter;
}[keyof GetterNames];
declare const getters: [Expect<Equal<GetterMismatch, never>>];
getters satisfies unknown;

// An unregistered name, or a name known only at runtime, resolves to `unknown`: the runtime
// throws when nothing is added under it.
const unregistered = strapi.get('container-lab.unregistered');
const dynamic = strapi.get(dynamicName);
declare const unregisteredLookups: [
  Expect<Equal<typeof unregistered, unknown>>,
  Expect<Equal<typeof dynamic, unknown>>,
];
unregisteredLookups satisfies unknown;

// An explicit type argument wins over the registry, including for unregistered names, as with
// `strapi.service<T>(uid)`.
type Explicit = { run(): void };
const explicitUnregistered = strapi.get<Explicit>('container-lab.unregistered');
const explicitRegistered = strapi.get<Explicit>('container-lab.greeter');
const explicitDynamic = strapi.get<Explicit>(dynamicName);
declare const explicitLookups: [
  Expect<Equal<typeof explicitUnregistered, Explicit>>,
  Expect<Equal<typeof explicitRegistered, Explicit>>,
  Expect<Equal<typeof explicitDynamic, Explicit>>,
  Expect<Equal<ReturnType<typeof strapi.get<{ custom: true }>>, { custom: true }>>,
];
explicitLookups satisfies unknown;

// The type argument is never inferred from the expected type: it stays `unknown`.
// @ts-expect-error `unknown` is not assignable to the annotation.
const contextual: Explicit = strapi.get('container-lab.unregistered');
contextual satisfies unknown;
const takesExplicit = (value: Explicit) => value;
// @ts-expect-error `unknown` is not assignable to the parameter.
takesExplicit(strapi.get(dynamicName));
// @ts-expect-error A registered name keeps its contract.
const wrongContract: Explicit = strapi.get('container-lab.greeter');
wrongContract satisfies unknown;

// Registered names are listed for completion, without restricting the accepted names.
type Lists<TName, TMember> = Equal<Extract<TName, TMember>, TMember>;
type GetName = Parameters<typeof strapi.get>[0];
type AddName = Parameters<typeof strapi.add>[0];
declare const names: [
  Expect<Lists<ContainerLookupName, 'webhookStore'>>,
  Expect<Lists<ContainerLookupName, 'container-lab.greeter'>>,
  Expect<Lists<GetName, 'query-params'>>,
  Expect<Lists<AddName, 'container-lab.greeter'>>,
  Expect<string extends GetName ? true : false>,
  Expect<string extends AddName ? true : false>,
];
names satisfies unknown;

// `add` checks the resolver of a registered name against its value, and returns the container with
// strict types, so a chain keeps resolving registered names. Unregistered and dynamic names take any
// resolver.
const chained = strapi
  .add('container-lab.greeter', () => ({ greet: (name: string) => `Hello ${name}` }))
  .add('container-lab.unregistered', { run() {} })
  .add(dynamicName, () => 1)
  .get('container-lab.greeter');
declare const chainedLookups: [Expect<Equal<typeof chained, Greeter>>];
chainedLookups satisfies unknown;

// A resolver is a factory, called once with the container and the `args` of the first `get`, or the
// value itself. A function value is not a resolver: the container would call it as a factory.
type ContainerFactory<TValue> = (container: StrapiInstance, args?: unknown) => TValue;
declare const resolvers: [
  Expect<Equal<ContainerResolver<'container-lab.greeter'>, ContainerFactory<Greeter> | Greeter>>,
  Expect<Equal<ContainerResolver<'container-lab.formatter'>, ContainerFactory<Formatter>>>,
  Expect<Equal<ContainerResolver<'container-lab.unregistered'>, unknown>>,
  Expect<Equal<ContainerResolver<string>, unknown>>,
];
resolvers satisfies unknown;

const formatter: Formatter = (value) => value.trim();
strapi.add('container-lab.greeter', { greet: (name: string) => name });
strapi.add('container-lab.formatter', () => formatter);
// The factory's parameters are typed: `container` is the strict `Strapi`.
strapi.add('container-lab.greeter', (container) => ({
  greet: (name: string) => container.get('container-lab.formatter')(name),
}));
strapi.add('container-lab.unregistered', 42);
strapi.add(dynamicName, 42);

// @ts-expect-error The factory returns a value that is not the registered `Greeter`.
strapi.add('container-lab.greeter', () => ({ greet: (name: number) => name }));
// @ts-expect-error A function value would be called as a factory: wrap it, `() => formatter`.
strapi.add('container-lab.formatter', formatter);
// @ts-expect-error A core name is checked against its registered value.
strapi.add('webhookStore', () => ({}));

// `coreStore`, `hooks` and `db` register a strict view, which refines the implementation with
// registries it cannot check (store rows, hooks, lifecycle events). `add` checks the implementation's
// contract; `get` returns the strict view.
declare const coreStore: Modules.CoreStore.CoreStore;
declare const database: Database;
strapi.add('coreStore', () => coreStore);
strapi.add('db', () => database);
declare const overlays: [
  // The core store is callable: only a factory adds it.
  Expect<Equal<ContainerResolver<'coreStore'>, ContainerFactory<Modules.CoreStore.CoreStore>>>,
  Expect<Equal<ContainerResolver<'db'>, ContainerFactory<Database> | Database>>,
  Expect<
    Equal<ReturnType<typeof strapi.get<unknown, 'coreStore'>>, Modules.CoreStore.StrictCoreStore>
  >,
  Expect<Equal<ReturnType<typeof strapi.get<unknown, 'db'>>, Modules.Lifecycles.StrictDatabase>>,
];
overlays satisfies unknown;
// @ts-expect-error The core store implementation is checked.
strapi.add('coreStore', () => ({ get: () => 1 }));
// @ts-expect-error The hooks registry implementation is checked.
strapi.add('hooks', () => ({ keys: () => [] }));
