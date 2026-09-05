import { createDatabaseCacheProvider } from '../caching/database-cache-provider';

describe('createDatabaseCacheProvider', () => {
  const findOne = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const deleteFn = jest.fn();

  const mockQuery = {
    findOne,
    create,
    update,
    delete: deleteFn,
  };

  const mockDb = {
    query: jest.fn(() => mockQuery),
  };

  const strapi = {
    db: mockDb,
    config: { get: jest.fn() },
  };

  let provider: ReturnType<typeof createDatabaseCacheProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = createDatabaseCacheProvider(strapi);
  });

  it('returns null when row missing', async () => {
    findOne.mockResolvedValue(null);

    expect(await provider.get('ns', 'k')).toBeNull();
    expect(mockDb.query).toHaveBeenCalledWith('strapi::cache-entry');
    expect(findOne).toHaveBeenCalledWith({ where: { namespace: 'ns', key: 'k' } });
  });

  it('returns entry and deletes when expired', async () => {
    const past = new Date(Date.now() - 5000);
    findOne.mockResolvedValue({
      id: 1,
      namespace: 'ns',
      key: 'k',
      value: { a: 1 },
      expiresAt: past,
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2020-01-02'),
    });

    expect(await provider.get('ns', 'k')).toBeNull();
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('maps row to CacheEntry when valid', async () => {
    const createdAt = new Date('2024-06-01T12:00:00.000Z');
    const updatedAt = new Date('2024-06-02T12:00:00.000Z');
    const future = new Date(Date.now() + 60_000);

    findOne.mockResolvedValue({
      id: 2,
      value: { x: true },
      expiresAt: future,
      createdAt,
      updatedAt,
    });

    const entry = await provider.get('ns', 'k');

    expect(entry!.value).toEqual({ x: true });
    expect(entry!.expiresAt!.getTime()).toBe(future.getTime());
    expect(entry!.createdAt.getTime()).toBe(createdAt.getTime());
  });

  it('creates when set and no existing row', async () => {
    findOne.mockResolvedValue(null);
    create.mockResolvedValue({ id: 1 });

    await provider.set('ns', 'k', { z: 2 });

    expect(create).toHaveBeenCalled();
    const data = create.mock.calls[0][0].data;
    expect(data.namespace).toBe('ns');
    expect(data.key).toBe('k');
    expect(data.value).toEqual({ z: 2 });
    expect(data.createdAt).toBeInstanceOf(Date);
    expect(data.updatedAt).toBeInstanceOf(Date);
    expect(data.expiresAt).toBeNull();
  });

  it('updates when set and row exists', async () => {
    findOne.mockResolvedValue({ id: 5 });
    update.mockResolvedValue({});

    await provider.set('ns', 'k', 99, { expiresAt: new Date('2030-01-01') });

    expect(update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: expect.objectContaining({
        value: 99,
        expiresAt: new Date('2030-01-01'),
      }),
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('delete removes row when present', async () => {
    findOne.mockResolvedValueOnce({ id: 7 }).mockResolvedValueOnce(null);

    await provider.delete('ns', 'k');

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it('delete no-ops when missing', async () => {
    findOne.mockResolvedValue(null);

    await provider.delete('ns', 'k');

    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('throws on empty namespace or key', async () => {
    await expect(provider.get('', 'k')).rejects.toThrow();
    await expect(provider.set('ns', '', 1)).rejects.toThrow();
  });
});
