import { describe, expect, test } from 'vitest';

import { createAppModule } from '../factories';

describe('factories.createAppModule', () => {
  test('returns the module it receives', () => {
    const app = { register() {}, bootstrap() {} };

    expect(createAppModule(app)).toBe(app);
  });

  test('adds no key, so the src/index validation still sees only the lifecycles', () => {
    const app = createAppModule({ bootstrap() {} });

    expect(Reflect.ownKeys(app)).toEqual(['bootstrap']);
  });
});
