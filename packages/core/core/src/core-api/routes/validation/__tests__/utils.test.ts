import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

import { createContentAPISchemaRegistry } from '../schema-registry';
import { safeSchemaCreation } from '../utils';

describe('safeSchemaCreation', () => {
  const createMockStrapi = (): Core.Strapi =>
    ({
      log: {
        debug: jest.fn(),
        error: jest.fn(),
      },
      contentAPISchemaRegistry: createContentAPISchemaRegistry(),
    }) as unknown as Core.Strapi;

  let strapi: Core.Strapi;

  beforeEach(() => {
    strapi = createMockStrapi();
    jest.clearAllMocks();
  });

  it('returns the registered schema without rebuilding it', () => {
    const schema = safeSchemaCreation(strapi, 'api::article.article', () =>
      z.object({ title: z.string() })
    );
    const callback = jest.fn(() => z.never());

    const existingSchema = safeSchemaCreation(strapi, 'api::article.article', callback);

    expect(existingSchema).toBe(schema);
    expect(callback).not.toHaveBeenCalled();
  });

  it('defers cyclical lookups until the real schema replaces the placeholder', () => {
    let cyclicalSchema: z.ZodType | undefined;

    const schema = safeSchemaCreation(strapi, 'api::article.article', () => {
      cyclicalSchema = safeSchemaCreation(strapi, 'api::article.article', () => z.never());

      return z.object({ title: z.string() });
    });

    expect(cyclicalSchema?.safeParse({ title: 'Article' }).success).toBe(true);
    expect(strapi.contentAPISchemaRegistry.get('ApiArticleArticleDocument')).toBe(schema);
    expect(schema.safeParse({ title: 'Article' }).success).toBe(true);
  });
});
