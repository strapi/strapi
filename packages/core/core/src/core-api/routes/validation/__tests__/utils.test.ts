import { schemaRegistry } from '@strapi/openapi';
import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

import { safeSchemaCreation } from '../utils';

describe('safeSchemaCreation', () => {
  const strapi = {
    log: {
      debug: jest.fn(),
      error: jest.fn(),
    },
  } as unknown as Core.Strapi;

  beforeEach(() => {
    schemaRegistry.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    schemaRegistry.clear();
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
    expect(schemaRegistry.get('ApiArticleArticleDocument')).toBe(schema);
    expect(schema.safeParse({ title: 'Article' }).success).toBe(true);
  });
});
