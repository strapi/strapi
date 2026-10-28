import { createRedisCacheProvider, DEFAULT_KEY_PREFIX } from '../redis-cache-provider';

describe('createRedisCacheProvider', () => {
  const SEP = '\u0000';

  const buildMockRedis = () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    pexpireat: jest.fn(),
    persist: jest.fn(),
  });

  it('set writes JSON and clears TTL when expiresAt is null', async () => {
    const redis = buildMockRedis();
    redis.get.mockResolvedValue(null);

    const provider = createRedisCacheProvider(redis as any, {});

    await provider.set('ns', 'k', { a: 1 });
    expect(redis.set).toHaveBeenCalledWith(
      `${DEFAULT_KEY_PREFIX}ns${SEP}k`,
      expect.stringContaining('"a":1')
    );
    expect(redis.persist).toHaveBeenCalledWith(`${DEFAULT_KEY_PREFIX}ns${SEP}k`);
  });

  it('get returns a CacheEntry with dates', async () => {
    const redis = buildMockRedis();
    redis.get.mockResolvedValue(
      JSON.stringify({
        value: { a: 1 },
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-02T00:00:00.000Z',
        expiresAt: null,
      })
    );

    const provider = createRedisCacheProvider(redis as any, {});
    const entry = await provider.get('ns', 'k');

    expect(entry?.value).toEqual({ a: 1 });
    expect(entry?.createdAt).toBeInstanceOf(Date);
    expect(entry?.updatedAt).toBeInstanceOf(Date);
    expect(entry?.expiresAt).toBeNull();
  });

  it('uses keyPrefix for the Redis key', async () => {
    const redis = buildMockRedis();
    redis.get.mockResolvedValue(null);

    const provider = createRedisCacheProvider(redis as any, { keyPrefix: 'myapp:' });
    await provider.set('ns', 'k', 1);

    expect(redis.set).toHaveBeenCalledWith(`myapp:ns${SEP}k`, expect.any(String));
  });

  it('get returns null and deletes when entry is expired', async () => {
    const redis = buildMockRedis();
    const past = new Date(Date.now() - 60_000).toISOString();
    redis.get.mockResolvedValueOnce(
      JSON.stringify({
        value: 1,
        createdAt: past,
        updatedAt: past,
        expiresAt: past,
      })
    );

    const provider = createRedisCacheProvider(redis as any, {});
    const entry = await provider.get('ns', 'k');

    expect(entry).toBeNull();
    expect(redis.del).toHaveBeenCalledWith(`${DEFAULT_KEY_PREFIX}ns${SEP}k`);
  });

  it('set with expiresAt calls pexpireat', async () => {
    const redis = buildMockRedis();
    const exp = new Date('2035-01-01T00:00:00.000Z');

    const provider = createRedisCacheProvider(redis as any, {});
    await provider.set('ns', 'k', 'v', { expiresAt: exp });

    expect(redis.pexpireat).toHaveBeenCalledWith(`${DEFAULT_KEY_PREFIX}ns${SEP}k`, exp.getTime());
  });

  it('delete removes the key', async () => {
    const redis = buildMockRedis();
    const provider = createRedisCacheProvider(redis as any, {});

    await provider.delete('ns', 'k');
    expect(redis.del).toHaveBeenCalledWith(`${DEFAULT_KEY_PREFIX}ns${SEP}k`);
  });

  it('throws on empty namespace', async () => {
    const redis = buildMockRedis();
    const provider = createRedisCacheProvider(redis as any, {});

    await expect(provider.get('', 'k')).rejects.toThrow(/namespace/);
  });
});
