import controller from '../settings';

const createStrapiMock = ({ hasProvider }: { hasProvider: boolean }) => {
  const services = {
    settings: {
      getSettings: jest.fn().mockResolvedValue({ aiLocalizations: { enabled: true } }),
      setSettings: jest.fn().mockResolvedValue(undefined),
    },
    'ai-translations': {
      hasProvider: jest.fn(() => hasProvider),
    },
  };

  return { plugins: { i18n: { services } } } as any;
};

describe('i18n settings controller', () => {
  describe('getSettings', () => {
    test('exposes the stored settings and reports AI localizations as available', async () => {
      global.strapi = createStrapiMock({ hasProvider: true });
      const ctx: any = {};

      await controller.getSettings(ctx);

      expect(ctx.body).toEqual({
        data: { aiLocalizations: { enabled: true }, aiLocalizationsAvailable: true },
      });
    });

    test('reports AI localizations as unavailable when no provider is registered', async () => {
      global.strapi = createStrapiMock({ hasProvider: false });
      const ctx: any = {};

      await controller.getSettings(ctx);

      expect(ctx.body.data.aiLocalizationsAvailable).toBe(false);
    });
  });
});
