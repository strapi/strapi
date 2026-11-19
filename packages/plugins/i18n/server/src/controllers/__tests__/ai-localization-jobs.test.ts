import createAILocalizationJobsController from '../ai-localization-jobs';

const createStrapiStub = (job: unknown) => {
  const services: Record<string, unknown> = {
    'ai-localizations': { isEnabled: jest.fn().mockResolvedValue(true) },
    'ai-localization-jobs': { getJobByContentType: jest.fn().mockResolvedValue(job) },
  };

  return {
    plugins: { i18n: { services } },
    plugin: () => ({ service: (name: string) => services[name] }),
    log: { error: jest.fn() },
  } as any;
};

describe('AI localization jobs controller', () => {
  test('looks services up on the injected Strapi instance, not the global one', async () => {
    const injectedJob = { id: 'injected' };
    global.strapi = createStrapiStub({ id: 'global' });
    const controller = createAILocalizationJobsController({
      strapi: createStrapiStub(injectedJob),
    });
    const ctx: any = { params: { contentType: 'api::homepage.homepage' } };

    await controller.getJobForSingleType(ctx);

    expect(ctx.body).toEqual({ data: injectedJob });
  });
});
