import { notifyMediaLibraryDefault } from '../media-library-default-notice';

const createStrapi = ({ optOut }: { optOut?: boolean | undefined }) => {
  const store = { get: jest.fn(async () => null), set: jest.fn(async () => {}) };

  return {
    strapi: {
      config: { get: jest.fn(() => optOut) },
      log: { info: jest.fn() },
      store: jest.fn(() => store),
    } as any,
    store,
  };
};

describe('Media Library default notice', () => {
  test('tells an upgrading app that took the new default', async () => {
    const { strapi, store } = createStrapi({ optOut: undefined });

    await notifyMediaLibraryDefault({ strapi, isExistingApp: true });

    expect(strapi.log.info).toHaveBeenCalledTimes(1);
    expect(strapi.log.info.mock.calls[0][0]).toContain('useLegacyMediaLibrary');
    // Persisted rather than remembered, so a restart does not repeat it.
    expect(store.set).toHaveBeenCalledWith({ value: { shown: true } });
  });

  test('stays quiet on a fresh install, which has no Media Library to lose', async () => {
    const { strapi, store } = createStrapi({ optOut: undefined });

    await notifyMediaLibraryDefault({ strapi, isExistingApp: false });

    expect(strapi.log.info).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  test.each([true, false])('stays quiet when the flag is set to %s', async (optOut) => {
    const { strapi } = createStrapi({ optOut });

    await notifyMediaLibraryDefault({ strapi, isExistingApp: true });

    // `false` is an app saying it knows and wants the new one, so it is not a surprise.
    expect(strapi.log.info).not.toHaveBeenCalled();
  });

  test('does not repeat itself once shown', async () => {
    const { strapi, store } = createStrapi({ optOut: undefined });
    store.get.mockResolvedValueOnce({ shown: true } as any);

    await notifyMediaLibraryDefault({ strapi, isExistingApp: true });

    expect(strapi.log.info).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });
});
