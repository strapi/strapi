import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

// The container keeps develop's signatures without strict types, even for the names registered in
// `ContainerEntries`: `get` returns its type argument, `any` by default, and `add` takes any resolver.
type IsAny<T> = 0 extends 1 & T ? true : false;
type DevelopContainer = {
  add<T, U extends string>(name: U, resolver: T): Core.Container;
  get<T = any>(name: string, args?: unknown): T;
  has(name: string): boolean;
};

declare const containerStrapi: Core.Strapi;
const webhookStore = containerStrapi.get('webhookStore');
const unregistered = containerStrapi.get('plugin-x.thing');
const contextual: { run(): void } = containerStrapi.get('plugin-x.thing');
const chained = containerStrapi.add('plugin-x.thing', () => ({})).get('webhookStore');
declare const containerChecks: [
  Expect<Equal<Core.Container, DevelopContainer>>,
  Expect<Equal<Core.Strapi['get'], Core.Container['get']>>,
  Expect<Equal<Core.Strapi['add'], Core.Container['add']>>,
  Expect<IsAny<typeof webhookStore>>,
  Expect<IsAny<typeof unregistered>>,
  Expect<IsAny<typeof chained>>,
];
containerChecks satisfies unknown;
contextual satisfies unknown;
