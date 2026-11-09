let failLoad = false;

jest.mock('stream-chain', () => {
  if (failLoad) {
    throw new Error('stream-chain unavailable');
  }

  return jest.requireActual('stream-chain');
});

describe('loadStreamDeps', () => {
  beforeEach(() => {
    jest.resetModules();
    failLoad = false;
  });

  test('caches a successful load', async () => {
    const { loadStreamDeps } = await import('../esm-deps');

    const first = loadStreamDeps();

    expect(loadStreamDeps()).toBe(first);
    await expect(first).resolves.toEqual({
      chain: expect.any(Function),
      parser: expect.any(Function),
      stringer: expect.any(Function),
    });
  });

  test('retries after a failed load', async () => {
    const { loadStreamDeps } = await import('../esm-deps');

    failLoad = true;
    await expect(loadStreamDeps()).rejects.toThrow('stream-chain unavailable');

    failLoad = false;
    await expect(loadStreamDeps()).resolves.toHaveProperty('stringer', expect.any(Function));
  });
});
