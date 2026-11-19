import { describe, it, expect, vi } from 'vitest';

import { hasUploadProviderMethod } from '../upload-provider';

describe('hasUploadProviderMethod', () => {
  it('is true when the provider implements the method', () => {
    const provider = { uploadStream: vi.fn(), delete: vi.fn() };

    expect(hasUploadProviderMethod(provider, 'uploadStream')).toBe(true);
    expect(hasUploadProviderMethod(provider, 'delete')).toBe(true);
  });

  it('is false when the member is missing or not a function', () => {
    const provider = { upload: vi.fn(), uploadStream: undefined, isPrivate: true };

    expect(hasUploadProviderMethod(provider, 'uploadStream')).toBe(false);
    expect(hasUploadProviderMethod(provider, 'isPrivate')).toBe(false);
    expect(hasUploadProviderMethod(provider, 'delete')).toBe(false);
  });

  it('is false when there is no provider', () => {
    expect(hasUploadProviderMethod(undefined, 'upload')).toBe(false);
    expect(hasUploadProviderMethod(null, 'upload')).toBe(false);
  });
});
