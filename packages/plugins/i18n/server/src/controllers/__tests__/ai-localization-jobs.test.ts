import createController from '../ai-localization-jobs';

const createStrapiMock = ({ enabled, job = { id: 1 } }: { enabled: boolean; job?: unknown }) => {
  const services = {
    'ai-localizations': { isEnabled: jest.fn().mockResolvedValue(enabled) },
    'ai-localization-jobs': {
      getJobByContentType: jest.fn().mockResolvedValue(job),
      getJobByDocument: jest.fn().mockResolvedValue(job),
    },
  };

  const strapi = { plugin: () => ({ service: (name: keyof typeof services) => services[name] }) };

  return { strapi: strapi as any, services };
};

describe('i18n ai-localization-jobs controller', () => {
  describe.each([
    ['getJobForSingleType', { contentType: 'api::a.a' }, 'getJobByContentType'],
    ['getJobForCollectionType', { contentType: 'api::a.a', documentId: 'doc' }, 'getJobByDocument'],
  ] as const)('%s', (method, params, serviceMethod) => {
    test('responds with null data instead of a 404 when AI localizations are disabled', async () => {
      const { strapi, services } = createStrapiMock({ enabled: false });
      const ctx: any = { params, notFound: jest.fn() };

      await createController({ strapi })[method](ctx);

      expect(ctx.body).toEqual({ data: null });
      expect(ctx.notFound).not.toHaveBeenCalled();
      expect(services['ai-localization-jobs'][serviceMethod]).not.toHaveBeenCalled();
    });

    test('returns the job when AI localizations are enabled', async () => {
      const { strapi } = createStrapiMock({ enabled: true });
      const ctx: any = { params };

      await createController({ strapi })[method](ctx);

      expect(ctx.body).toEqual({ data: { id: 1 } });
    });
  });
});
