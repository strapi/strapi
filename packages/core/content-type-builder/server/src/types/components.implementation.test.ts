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
      Parameters<typeof components.deleteComponent>,
      Parameters<ComponentsService['deleteComponent']>
    >
  >,
];
