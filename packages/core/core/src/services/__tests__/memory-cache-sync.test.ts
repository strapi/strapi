import { memoryCacheSync } from '../caching/memory-cache-provider';

describe('memoryCacheSync', () => {
  const ns = 'strapi::test::memory-cache-sync';

  it('stores and reads synchronously', () => {
    memoryCacheSync.set(ns, 'k', { a: 1 });
    const entry = memoryCacheSync.get(ns, 'k');

    expect(entry?.value).toEqual({ a: 1 });
    memoryCacheSync.delete(ns, 'k');
    expect(memoryCacheSync.get(ns, 'k')).toBeNull();
  });
});
