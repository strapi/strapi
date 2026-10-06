import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

const ARTICLE_UID = 'api::stack-article.stack-article';

const articleModel = {
  kind: 'collectionType',
  displayName: 'stack-article',
  singularName: 'stack-article',
  pluralName: 'stack-articles',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
  },
};

interface PoolClient {
  pool: { max: number; numUsed(): number };
  acquireConnection(): Promise<unknown>;
  releaseConnection(connection: unknown): Promise<unknown>;
}

/** Takes every free connection so the next acquire has to wait for the timeout. */
const saturatePool = async (strapi: Core.Strapi) => {
  const client = strapi.db.connection.client as unknown as PoolClient;
  const free = client.pool.max - client.pool.numUsed();
  const held = await Promise.all(Array.from({ length: free }, () => client.acquireConnection()));

  return async () => {
    await Promise.all(held.map((connection) => client.releaseConnection(connection)));
  };
};

async function queryFromTestCode(strapi: Core.Strapi) {
  const result = await strapi.db.query('strapi::core-store').findMany({ limit: 1 });
  return result;
}

describe('Async stack traces on the query path', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: any;
  let saturateOnFindMany = false;
  let captured: Error | undefined;

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();

    strapi = await createStrapiInstance({
      register: ({ strapi: s }: { strapi: Core.Strapi }) => {
        s.config.set('database.connection.acquireConnectionTimeout', 1000);
      },
    });

    // Registered after load so it runs last, right before the document service starts its transaction
    strapi.documents.use(async (ctx: any, next: () => Promise<unknown>) => {
      if (!saturateOnFindMany || ctx.uid !== ARTICLE_UID || ctx.action !== 'findMany') {
        return next();
      }

      const release = await saturatePool(strapi);
      try {
        return await next();
      } catch (error) {
        captured = error as Error;
        throw error;
      } finally {
        await release();
      }
    });

    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(() => {
    saturateOnFindMany = false;
    captured = undefined;
  });

  test('uses the acquire timeout configured for this suite', () => {
    expect((strapi.db.connection.client as any).config.acquireConnectionTimeout).toBe(1000);
  });

  test('a REST request that times out starting its transaction reports the controller and the document service', async () => {
    saturateOnFindMany = true;

    const res = await rq({ method: 'GET', url: '/stack-articles' });

    expect(res.statusCode).toBe(500);
    expect(captured?.name).toBe('KnexTimeoutError');
    expect(captured?.stack).toMatch(/services[\\/]document-service[\\/]/);
    expect(captured?.stack).toMatch(/core-api[\\/]service[\\/]collection-type/);
    expect(captured?.stack).toMatch(/core-api[\\/]controller[\\/]collection-type/);
  });

  test('a direct query that times out reports the entity repository and its caller', async () => {
    const release = await saturatePool(strapi);

    try {
      const error = (await queryFromTestCode(strapi).catch((e: Error) => e)) as Error;

      expect(error.name).toBe('KnexTimeoutError');
      expect(error.stack).toMatch(/entity-manager[\\/]entity-repository/);
      expect(error.stack).toContain('queryFromTestCode');
    } finally {
      await release();
    }
  });
});
