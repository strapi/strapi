import * as z from 'zod/v4';

import { createStrapiInstance } from 'api-tests/strapi';
import { generate } from '@strapi/openapi';

/** Returns true if any path operation in the spec has a query parameter with the given name. */
function hasQueryParamInSpec(
  document: {
    paths?: Record<string, Record<string, { parameters?: Array<{ name?: string; in?: string }> }>>;
  },
  paramName: string
): boolean {
  const paths = document.paths ?? {};
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const op = pathItem[method];
      if (op?.parameters?.some((p) => p?.name === paramName && p?.in === 'query')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * API test: when contentAPI.addQueryParams is called (e.g. at runtime or in register()),
 * the params are merged into existing content-api routes. The OpenAPI generator reads
 * route.request from strapi.apis/plugins, so the generated spec should include the params.
 */
describe('OpenAPI – extra params from contentAPI.addQueryParams', () => {
  let strapi: Awaited<ReturnType<typeof createStrapiInstance>>;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      register: ({ strapi: s }) => {
        s.contentAPI.addQueryParams({
          search: { schema: z.string().max(200).optional() },
        });
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  it('includes in the generated spec a query param added via addQueryParams', () => {
    const { document } = generate(strapi, { type: 'content-api' });

    expect(document.paths).toBeDefined();
    expect(Object.keys(document.paths ?? {}).length).toBeGreaterThan(0);
    expect(hasQueryParamInSpec(document, 'search')).toBe(true);
  });
});
