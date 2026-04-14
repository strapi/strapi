import type { Modules } from '@strapi/types';
import { createMemoryCacheProvider } from '../caching/memory-cache-provider';

describe('createMemoryCacheProvider', () => {
  let provider: Modules.Cache.CacheProvider;

  beforeEach(() => {
    provider = createMemoryCacheProvider();
  });

  it('returns null for missing key', async () => {
    expect(await provider.get('ns', 'k')).toBeNull();
  });

  it('stores and returns value with timestamps', async () => {
    const before = Date.now();
    await provider.set('ns', 'k', { foo: 1 });
    const entry = await provider.get('ns', 'k');
    const after = Date.now();

    expect(entry).not.toBeNull();
    expect(entry!.value).toEqual({ foo: 1 });
    expect(entry!.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(entry!.createdAt.getTime()).toBeLessThanOrEqual(after);
    expect(entry!.updatedAt.getTime()).toEqual(entry!.createdAt.getTime());
    expect(entry!.expiresAt).toBeNull();
  });

  it('isolates namespaces', async () => {
    await provider.set('a', 'k', 1);
    await provider.set('b', 'k', 2);

    expect((await provider.get('a', 'k'))!.value).toBe(1);
    expect((await provider.get('b', 'k'))!.value).toBe(2);
  });

  it('updates updatedAt on overwrite', async () => {
    await provider.set('ns', 'k', 'first');
    const first = await provider.get('ns', 'k');

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5);
    });
    await provider.set('ns', 'k', 'second');
    const second = await provider.get('ns', 'k');

    expect(second!.value).toBe('second');
    expect(second!.createdAt.getTime()).toEqual(first!.createdAt.getTime());
    expect(second!.updatedAt.getTime()).toBeGreaterThan(first!.updatedAt.getTime());
  });

  it('deletes entry', async () => {
    await provider.set('ns', 'k', 1);
    await provider.delete('ns', 'k');
    expect(await provider.get('ns', 'k')).toBeNull();
  });

  it('returns null and removes when expiresAt is in the past', async () => {
    const past = new Date(Date.now() - 1000);
    await provider.set('ns', 'k', 'x', { expiresAt: past });

    expect(await provider.get('ns', 'k')).toBeNull();
    expect(await provider.get('ns', 'k')).toBeNull();
  });

  it('returns value when expiresAt is in the future', async () => {
    const future = new Date(Date.now() + 60_000);
    await provider.set('ns', 'k', 'ok', { expiresAt: future });

    expect((await provider.get('ns', 'k'))!.value).toBe('ok');
  });

  it('throws on empty namespace or key', async () => {
    await expect(provider.get('', 'k')).rejects.toThrow();
    await expect(provider.get('ns', '')).rejects.toThrow();
    await expect(provider.set('', 'k', 1)).rejects.toThrow();
    await expect(provider.set('ns', '', 1)).rejects.toThrow();
    await expect(provider.delete('', 'k')).rejects.toThrow();
    await expect(provider.delete('ns', '')).rejects.toThrow();
  });
});
