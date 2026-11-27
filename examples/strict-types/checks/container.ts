// Type checks only, run by `yarn test:ts` (see contracts.ts). What an application sees through the
// container: `strapi.get(name)` and `strapi.add(name, resolver)`.
import type { Core, Modules } from '@strapi/strapi';

// Operands wrapped in a tuple: TypeScript's error type (an unresolved type, printed as `any`)
// would otherwise make the comparison true for any other operand.
type Equal<T, U> =
  (<V>() => V extends [T] ? 1 : 2) extends <V>() => V extends [U] ? 1 : 2 ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;

declare const strapi: Core.Strapi;
declare const dynamicName: string;

// An application registers the names it adds to the container.
type GreeterService = { greet(name: string): string };
declare global {
  namespace Strapi {
    namespace Registries {
      interface ContainerEntries {
        'app.greeter': GreeterService;
      }
    }
  }
}

// Names Strapi adds resolve to their contracts.
const webhookStore = strapi.get('webhookStore');
const queryParams = strapi.get('query-params');
export type CoreNames = [
  Core.Assert<Equal<typeof webhookStore, Modules.WebhookStore.WebhookStore>>,
  Core.Assert<Equal<IsAny<typeof queryParams>, false>>,
];
webhookStore.addAllowedEvent('ARTICLE_SHARED', 'article.shared');
strapi.get('auth').register('content-api', {
  name: 'app-strategy',
  authenticate: async () => ({ authenticated: false }),
});
strapi.get('auth').register('content-api', {
  name: 'app-strategy',
  // @ts-expect-error The strategy is checked against the auth contract: `authenticate` returns a promise.
  authenticate: () => ({ authenticated: false }),
});

// A name the application registers resolves to its contract, and `add` checks its resolver: a
// factory, whose `container` is typed, or the value itself.
strapi.add('app.greeter', () => ({ greet: (name: string) => `Hello ${name}` }));
strapi.add('app.greeter', (container) => container.get('app.greeter'));
// @ts-expect-error The factory returns a value that is not the registered contract.
strapi.add('app.greeter', () => ({ greet: (name: number) => name }));
const greeter = strapi.get('app.greeter');
export type AppNames = [Core.Assert<Equal<typeof greeter, GreeterService>>];
greeter.greet('Ada') satisfies string;

// An unregistered name, or a name known only at runtime, resolves to `unknown`; an explicit type
// argument is the escape hatch.
const unregistered = strapi.get('plugin-x.thing');
const dynamic = strapi.get(dynamicName);
const explicit = strapi.get<{ run(): void }>('plugin-x.thing');
export type UnregisteredNames = [
  Core.Assert<Equal<typeof unregistered, unknown>>,
  Core.Assert<Equal<typeof dynamic, unknown>>,
  Core.Assert<Equal<typeof explicit, { run(): void }>>,
];
// @ts-expect-error The type argument is never inferred from the annotation: `unknown` does not fit.
const annotated: { run(): void } = strapi.get('plugin-x.thing');
annotated satisfies unknown;
