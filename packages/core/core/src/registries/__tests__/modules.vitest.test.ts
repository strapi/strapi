import { describe, expect, it } from 'vitest';

import modulesRegistry from '../modules';

const registries = () => ({
  add: () => undefined,
  get: () => undefined,
  getAll: () => ({}),
  set: () => undefined,
});

const createStrapi = () =>
  ({
    get: () => registries(),
  }) as never;

describe('modules registry destroy', () => {
  it('runs a failed module again and skips one that finished', async () => {
    const calls: string[] = [];
    let failB = true;
    const registry = modulesRegistry(createStrapi());

    registry.add('a', {
      async destroy() {
        calls.push('a');
      },
    });
    registry.add('b', {
      async destroy() {
        calls.push('b');
        if (failB) {
          throw new Error('b failed');
        }
      },
    });

    await expect(registry.destroy()).rejects.toThrow('b failed');
    expect(calls).toEqual(['a', 'b']);

    await expect(registry.get('a').destroy()).rejects.toThrow(
      'Destroy for a has already been called'
    );

    failB = false;
    await registry.destroy();
    expect(calls).toEqual(['a', 'b', 'b']);
  });
});
