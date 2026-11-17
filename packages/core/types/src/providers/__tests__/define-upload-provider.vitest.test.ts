import { describe, expect, test } from 'vitest';

import { defineUploadProvider } from '../upload';

describe('defineUploadProvider', () => {
  test('returns the provider module it receives', () => {
    const providerModule = {
      init: () => ({ upload() {}, delete() {} }),
    };

    expect(defineUploadProvider(providerModule)).toBe(providerModule);
  });
});
