// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Equal, Expect } from './assert.test';
import type { ComponentsService } from './services';
import type * as components from '../services/components';

export type Assertions = [
  Expect<
    Equal<
      Parameters<typeof components.formatComponent>,
      Parameters<ComponentsService['formatComponent']>
    >
  >,
  Expect<
    Equal<
      Parameters<typeof components.createComponent>,
      Parameters<ComponentsService['createComponent']>
    >
  >,
  // `editComponent` takes develop's `ComponentToCreate`, whose attributes are `unknown`: the
  // contract's payload, with typed attribute inputs, is one of them.
  Expect<
    Equal<
      Parameters<typeof components.editComponent>[0],
      Parameters<ComponentsService['editComponent']>[0]
    >
  >,
  Expect<Equal<Parameters<typeof components.editComponent>[1], components.ComponentToCreate>>,
  Expect<
    Equal<
      Parameters<ComponentsService['editComponent']>[1] extends components.ComponentToCreate
        ? true
        : false,
      true
    >
  >,
  Expect<
    Equal<
      Parameters<typeof components.deleteComponent>,
      Parameters<ComponentsService['deleteComponent']>
    >
  >,
];
