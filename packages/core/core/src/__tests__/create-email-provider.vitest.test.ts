import { describe, expect, test } from 'vitest';

import { createEmailProvider } from '../factories';

describe('factories.createEmailProvider', () => {
  test('returns the provider module it receives', () => {
    const providerModule = {
      name: 'test',
      init: () => ({ send: () => Promise.resolve() }),
    };

    expect(createEmailProvider(providerModule)).toBe(providerModule);
  });
});
