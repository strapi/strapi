import type { ErrorObject, SchemaObject } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { Core, Schema } from '@strapi/types';
import * as z from 'zod/v4';

import { createRoutes } from '../index';

/**
 * Same Zod JSON Schema target `@strapi/openapi` uses in `zodToOpenAPI`
 * (draft 2020-12, output mode). That is the dialect Ajv checks.
 */
const OPENAPI_SCHEMA_CONVERSION_OPTIONS = {
  target: 'draft-2020-12',
  io: 'output',
} as const;

const DOCUMENT_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

const articleDocument = {
  id: 1,
  documentId: DOCUMENT_ID,
  title: 'Hello',
  slug: 'hello',
  content: 'Body',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  publishedAt: '2026-01-03T00:00:00.000Z',
};

/**
 * Realistic collection `find` body (`GET /api/articles?pagination[pageSize]=1`).
 * Strapi always returns `data` plus `meta.pagination`.
 */
const collectionFindBody = {
  data: [articleDocument],
  meta: {
    pagination: { page: 1, pageSize: 1, pageCount: 3, total: 3 },
  },
};

/** findOne / create / update (and single-type find / update) return an empty meta object. */
const singleDocumentBody = {
  data: articleDocument,
  meta: {},
};

const articleAttributes = {
  title: { type: 'string' },
  slug: { type: 'uid' },
  content: { type: 'text' },
  createdAt: { type: 'datetime' },
  updatedAt: { type: 'datetime' },
  publishedAt: { type: 'datetime' },
} as Schema.ContentType['attributes'];

const contentType = (
  kind: Schema.ContentType['kind'],
  names: { singularName: string; pluralName: string }
): Schema.ContentType =>
  ({
    uid: `api::${names.singularName}.${names.singularName}`,
    kind,
    modelType: 'contentType',
    info: { displayName: names.singularName, ...names },
    options: {},
    attributes: articleAttributes,
  }) as Schema.ContentType;

const useStrapi = (model: Schema.ContentType) => {
  const strapi = {
    getModel: () => model,
    localization: { isLocalizedContentType: () => false },
    config: { get: () => [] },
    plugins: {},
    apis: {},
    admin: { services: {} },
  } as unknown as Core.Strapi;

  global.strapi = strapi;
  return strapi;
};

const toResponseSchema = (response: z.ZodType | undefined): SchemaObject => {
  if (!response) {
    throw new Error('route is missing a response schema');
  }

  const schema = z.toJSONSchema(response, OPENAPI_SCHEMA_CONVERSION_OPTIONS);

  if ('$id' in schema) {
    delete schema.$id;
  }

  return schema as SchemaObject;
};

const compile = (schema: SchemaObject) => {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
};

const errorText = (errors: ErrorObject[] | null | undefined) =>
  (errors ?? []).map((error) => `${error.instancePath} ${error.message}`).join('; ');

describe('content-api OpenAPI response envelopes', () => {
  const article = contentType('collectionType', {
    singularName: 'article',
    pluralName: 'articles',
  });
  const homepage = contentType('singleType', {
    singularName: 'homepage',
    pluralName: 'homepages',
  });

  const collectionRoutes = createRoutes({ strapi: useStrapi(article), contentType: article });
  const singleRoutes = createRoutes({ strapi: useStrapi(homepage), contentType: homepage });

  const collectionFindSchema = toResponseSchema(collectionRoutes.find.response);
  const validateCollectionFind = compile(collectionFindSchema);

  test('collection find accepts data and meta.pagination', () => {
    const valid = validateCollectionFind(collectionFindBody);

    expect(errorText(validateCollectionFind.errors)).toBe('');
    expect(valid).toBe(true);
    expect(collectionFindSchema.additionalProperties).toBe(false);
    expect(collectionFindSchema.properties).toHaveProperty('meta');
  });

  test('collection find describes page and offset pagination', () => {
    expect(
      validateCollectionFind({
        data: [],
        meta: { pagination: { start: 0, limit: 10, total: 3 } },
      })
    ).toBe(true);

    // withCount=false omits total and pageCount
    expect(
      validateCollectionFind({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25 } },
      })
    ).toBe(true);

    expect(
      validateCollectionFind({
        data: [],
        meta: { pagination: { start: 0, limit: 10 } },
      })
    ).toBe(true);
  });

  test('collection find still rejects unknown properties', () => {
    expect(validateCollectionFind({ ...collectionFindBody, error: 'nope' })).toBe(false);
    expect(validateCollectionFind({ data: collectionFindBody.data })).toBe(false);
    expect(validateCollectionFind({ data: collectionFindBody.data, meta: {} })).toBe(false);
    expect(
      validateCollectionFind({
        data: collectionFindBody.data,
        meta: { pagination: collectionFindBody.meta.pagination, extra: true },
      })
    ).toBe(false);
  });

  test.each(['findOne', 'create', 'update', 'delete'] as const)(
    'collection %s accepts data and an empty meta object',
    (action) => {
      const schema = toResponseSchema(collectionRoutes[action].response);
      const validate = compile(schema);

      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties).toHaveProperty('meta');

      const valid = validate(singleDocumentBody);
      expect(errorText(validate.errors)).toBe('');
      expect(valid).toBe(true);

      expect(validate({ ...singleDocumentBody, error: 'nope' })).toBe(false);
      expect(validate({ data: articleDocument })).toBe(false);
      expect(
        validate({
          data: articleDocument,
          meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
        })
      ).toBe(false);
    }
  );

  test.each(['find', 'update', 'delete'] as const)(
    'single type %s accepts data and an empty meta object',
    (action) => {
      const schema = toResponseSchema(singleRoutes[action].response);
      const validate = compile(schema);

      const valid = validate(singleDocumentBody);
      expect(errorText(validate.errors)).toBe('');
      expect(valid).toBe(true);
      expect(schema.additionalProperties).toBe(false);
    }
  );
});
