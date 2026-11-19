// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createComponentsService from '../services/components';
import type { Equal, Expect } from './assert.test';
import type { ComponentModelConfiguration, ComponentsService } from './services';

type Implementation = ReturnType<typeof createComponentsService>;
type FoundConfiguration = Awaited<ReturnType<Implementation['findConfiguration']>>;

// The factory is checked here instead of with `satisfies`: a tie would type `this` as the
// contract, where `findComponent` may return `undefined`, and `findComponentsConfigurations`
// reads the component it returns without a check. That member stays out of the check.
//
// With strict types, a found component configuration carries its component UID and `isComponent`.
// `findAllComponents` is `any[]`: `Object.values` cannot read the component registry, whose keys
// are template literal UIDs. This pin flips when the registry lookup is typed.
export type ComponentsImplementationAssertions = [
  Expect<
    Implementation extends Omit<ComponentsService, 'findComponentsConfigurations'> ? true : false
  >,
  Expect<FoundConfiguration extends ComponentModelConfiguration ? true : false>,
  Expect<Equal<FoundConfiguration['isComponent'], boolean>>,
  Expect<
    Awaited<ReturnType<Implementation['updateConfiguration']>> extends ComponentModelConfiguration
      ? true
      : false
  >,
  Expect<Equal<ReturnType<Implementation['findAllComponents']>, any[]>>,
];
