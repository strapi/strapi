import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';
import type * as z from 'zod/v4';

describe('i18n - Content API /locales response schema', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let contentApiRq: ReturnType<typeof createContentAPIRequest>;
  let createdLocaleId: number;

  // The schema that the route declares and that the OpenAPI generator documents
  const getLocalesResponseSchema = (): z.ZodType => {
    const router = strapi.plugin('i18n').routes['content-api'] as unknown as {
      routes: Core.RouterInput['routes'];
    };
    const route = router.routes.find((r) => r.method === 'GET' && r.path === '/locales');

    if (route === undefined || route.response === undefined) {
      throw new Error('GET /locales content API route has no response schema');
    }

    return route.response as z.ZodType;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    contentApiRq = createContentAPIRequest({ strapi });

    const res = await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'en-US', name: 'English (United States) (en-US)', isDefault: false },
    });
    expect(res.statusCode).toBe(200);
    createdLocaleId = res.body.id;
  });

  afterAll(async () => {
    await rq({ method: 'DELETE', url: `/i18n/locales/${createdLocaleId}` });
    await strapi.destroy();
  });

  test('Real response with a region locale code and cuid2 documentIds matches the declared schema', async () => {
    const res = await contentApiRq({ method: 'GET', url: '/i18n/locales' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'en-US', isDefault: false })])
    );

    const result = getLocalesResponseSchema().safeParse(res.body);

    expect(result.error?.issues).toBeUndefined();
    expect(result.success).toBe(true);
  });
});
