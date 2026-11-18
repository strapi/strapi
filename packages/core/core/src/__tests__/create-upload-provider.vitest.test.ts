import { describe, expect, test } from 'vitest';

import { createUploadProvider } from '../factories';

describe('factories.createUploadProvider', () => {
  test('returns the provider module it receives', () => {
    const providerModule = {
      init: () => ({ upload() {}, delete() {} }),
    };

    expect(createUploadProvider(providerModule)).toBe(providerModule);
  });
});
