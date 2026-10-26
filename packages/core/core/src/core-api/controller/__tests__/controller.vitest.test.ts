import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Core, Struct } from '@strapi/types';

import { createController } from '..';

/**
 * The core-api controllers validate and sanitize the query, sanitize the input and the output
 * through the content API, call the content type's service, and transform its result.
 */

const article = {
  uid: 'api::article.article',
  kind: 'collectionType',
  modelType: 'contentType',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: {},
  attributes: { title: { type: 'string' } },
} as unknown as Struct.CollectionTypeSchema;

const homepage = {
  ...article,
  uid: 'api::homepage.homepage',
  kind: 'singleType',
  info: { singularName: 'homepage', pluralName: 'homepages', displayName: 'Homepage' },
} as unknown as Struct.SingleTypeSchema;

// The output sanitizer drops it
const PRIVATE = 'private';

const createCtx = ({ params = {}, query = {}, body }: Record<string, any> = {}) =>
  ({ params, query, request: { body }, state: { auth: { strategy: 'api-token' } } }) as any;

let service: Record<string, ReturnType<typeof vi.fn>>;
let contentAPI: {
  sanitize: Record<string, ReturnType<typeof vi.fn>>;
  validate: Record<string, ReturnType<typeof vi.fn>>;
};

beforeEach(() => {
  const entity = (data: object) => ({ id: 1, documentId: 'doc', ...data, [PRIVATE]: true });
  service = {
    find: vi.fn(async (query: object) => entity({ query })),
    findOne: vi.fn(async (id: string, query: object) => entity({ id, query })),
    create: vi.fn(async (params: object) => entity(params)),
    update: vi.fn(async (id: string, params: object) => entity({ id, ...params })),
    createOrUpdate: vi.fn(async (params: object) => entity(params)),
    delete: vi.fn(async () => undefined),
  };
  contentAPI = {
    sanitize: {
      query: vi.fn(async (query: object) => ({ ...query, sanitized: true })),
      input: vi.fn(async (data: object) => ({ ...data, sanitizedInput: true })),
      output: vi.fn(async (data: unknown) => {
        const strip = ({ [PRIVATE]: _, ...rest }: Record<string, unknown>) => rest;
        return Array.isArray(data) ? data.map(strip) : strip(data as Record<string, unknown>);
      }),
    },
    validate: { query: vi.fn(async () => {}), input: vi.fn(async () => {}) },
  };

  globalThis.strapi = {
    service: vi.fn(() => service),
    contentAPI,
    config: { get: vi.fn(() => true) },
  } as unknown as Core.Strapi;
});

describe('collection type controller', () => {
  const controller = () => createController({ contentType: article });

  test('find returns the sanitized results with the pagination', async () => {
    service.find.mockResolvedValue({
      results: [{ id: 1, [PRIVATE]: true }],
      pagination: { page: 1 },
    });

    const response = await controller().find(createCtx({ query: { sort: 'title' } }));

    expect(service.find).toHaveBeenCalledWith({ sort: 'title', sanitized: true });
    expect(response).toEqual({ data: [{ id: 1 }], meta: { pagination: { page: 1 } } });
    expect(contentAPI.validate.query).toHaveBeenCalledWith({ sort: 'title' }, article, {
      auth: { strategy: 'api-token' },
      route: undefined,
      strictParams: true,
    });
  });

  test('findOne finds the document by its id with the sanitized query', async () => {
    const response = await controller().findOne(createCtx({ params: { id: 'doc' } }));

    expect(service.findOne).toHaveBeenCalledWith('doc', { sanitized: true });
    expect(response.data).not.toHaveProperty(PRIVATE);
  });

  test('create creates the document from the sanitized data and responds 201', async () => {
    const ctx = createCtx({ body: { data: { title: 'Hello' } } });

    const response = await controller().create(ctx);

    expect(contentAPI.validate.input).toHaveBeenCalledWith(
      { title: 'Hello' },
      article,
      expect.anything()
    );
    expect(service.create).toHaveBeenCalledWith({
      sanitized: true,
      data: { title: 'Hello', sanitizedInput: true },
    });
    expect(ctx.status).toBe(201);
    expect(response.data).toMatchObject({ data: { title: 'Hello', sanitizedInput: true } });
    expect(response.data).not.toHaveProperty(PRIVATE);
  });

  test('create rejects a body without a data object', async () => {
    await expect(controller().create(createCtx({ body: { title: 'Hello' } }))).rejects.toThrow(
      'Missing "data" payload in the request body'
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  test('update updates the document by its id with the sanitized data', async () => {
    const response = await controller().update(
      createCtx({ params: { id: 'doc' }, body: { data: { title: 'Updated' } } })
    );

    expect(service.update).toHaveBeenCalledWith('doc', {
      sanitized: true,
      data: { title: 'Updated', sanitizedInput: true },
    });
    expect(response.data).not.toHaveProperty(PRIVATE);
  });

  test('update rejects a body without a data object', async () => {
    await expect(
      controller().update(createCtx({ params: { id: 'doc' }, body: {} }))
    ).rejects.toThrow('Missing "data" payload in the request body');
  });

  test('delete deletes the document by its id and responds 204', async () => {
    const ctx = createCtx({ params: { id: 'doc' }, query: { locale: 'fr' } });

    await controller().delete(ctx);

    expect(service.delete).toHaveBeenCalledWith('doc', { locale: 'fr', sanitized: true });
    expect(ctx.status).toBe(204);
  });
});

describe('single type controller', () => {
  const controller = () => createController({ contentType: homepage });

  test('find returns the sanitized document found with the sanitized query', async () => {
    const response = await controller().find(createCtx({ query: { locale: 'fr' } }));

    expect(service.find).toHaveBeenCalledWith({ locale: 'fr', sanitized: true });
    expect(response.data).not.toHaveProperty(PRIVATE);
  });

  test('update creates or updates the document from the sanitized data', async () => {
    const response = await controller().update(createCtx({ body: { data: { title: 'Home' } } }));

    expect(service.createOrUpdate).toHaveBeenCalledWith({
      sanitized: true,
      data: { title: 'Home', sanitizedInput: true },
    });
    expect(response.data).not.toHaveProperty(PRIVATE);
  });

  test('update rejects a body without a data object', async () => {
    await expect(controller().update(createCtx({ body: { data: 'Home' } }))).rejects.toThrow(
      'Missing "data" payload in the request body'
    );
    expect(service.createOrUpdate).not.toHaveBeenCalled();
  });

  test('delete deletes the document with the sanitized query and responds 204', async () => {
    const ctx = createCtx({ query: { locale: 'fr' } });

    await controller().delete(ctx);

    expect(service.delete).toHaveBeenCalledWith({ locale: 'fr', sanitized: true });
    expect(ctx.status).toBe(204);
  });
});
