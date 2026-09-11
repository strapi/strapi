import type { Core } from '@strapi/types';

import {
  assertRemoteEntityAllowed,
  assertRemoteLinkAllowed,
  isIgnoredOfficialTransferType,
  isProtectedRemotePushType,
  normalizeRemoteRestoreOptions,
} from '../transfer-policy';

const schemas = {
  'api::article.article': {
    uid: 'api::article.article',
    attributes: {
      title: { type: 'string' },
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        owner: true,
        joinColumn: { name: 'created_by_id' },
      },
      permissions: { type: 'relation', relation: 'oneToMany', target: 'admin::permission' },
      block: { type: 'component', repeatable: false, component: 'shared.block' },
      blocks: { type: 'dynamiczone', components: ['shared.block'] },
      related: { type: 'relation', relation: 'morphToMany' },
    },
  },
  'shared.block': {
    uid: 'shared.block',
    attributes: {
      permissions: { type: 'relation', relation: 'oneToMany', target: 'admin::permission' },
    },
  },
  'admin::user': { uid: 'admin::user', attributes: {} },
  'admin::permission': { uid: 'admin::permission', attributes: {} },
  'strapi::core-store': { uid: 'strapi::core-store', attributes: {} },
} as const;

const databaseSchemas = {
  ...schemas,
  'api::article.article': {
    ...schemas['api::article.article'],
    attributes: {
      ...schemas['api::article.article'].attributes,
      blocks: {
        type: 'relation',
        relation: 'morphToMany',
        morphColumn: { typeField: '__type' },
      },
    },
  },
} as const;

const createStrapi = () =>
  ({
    contentTypes: {
      'api::article.article': schemas['api::article.article'],
      'admin::user': schemas['admin::user'],
    },
    get: jest.fn(() => ({
      get: () => [schemas['admin::permission'], schemas['strapi::core-store']],
    })),
    getModel: jest.fn((uid: keyof typeof schemas) => schemas[uid]),
    db: {
      metadata: {
        get: jest.fn((uid: keyof typeof databaseSchemas) => databaseSchemas[uid]),
      },
    },
  }) as unknown as Core.Strapi;

describe('transfer policy', () => {
  test('keeps remote admin protection distinct from official CLI exclusions', () => {
    expect(isProtectedRemotePushType('admin::future-model')).toBe(true);
    expect(isProtectedRemotePushType('plugin::content-releases.release')).toBe(false);
    expect(isIgnoredOfficialTransferType('admin::user')).toBe(true);
    expect(isIgnoredOfficialTransferType('plugin::content-releases.release')).toBe(true);
    expect(isIgnoredOfficialTransferType('api::article.article')).toBe(false);
  });

  test('normalizes protected restore types without mutating other restore options', () => {
    const strapi = createStrapi();
    const restore = {
      assets: false,
      configuration: { coreStore: false, webhook: true },
      entities: {
        include: ['api::article.article', 'admin::user'],
        exclude: ['plugin::upload.file'],
        filters: [() => true],
        params: { 'api::article.article': { locale: 'en' } },
      },
    };

    const normalized = normalizeRemoteRestoreOptions(strapi, restore);

    expect(normalized).toEqual({
      ...restore,
      entities: {
        include: ['api::article.article'],
        exclude: expect.arrayContaining([
          'plugin::upload.file',
          'admin::user',
          'admin::permission',
        ]),
        params: { 'api::article.article': { locale: 'en' } },
      },
    });
    expect(normalized.entities).not.toHaveProperty('filters');
    expect(restore.entities.include).toEqual(['api::article.article', 'admin::user']);
    expect(restore.entities.exclude).toEqual(['plugin::upload.file']);
    expect(restore.entities.filters).toHaveLength(1);
  });

  test('rejects protected entity roots and either protected link endpoint', () => {
    const strapi = createStrapi();

    expect(() =>
      assertRemoteEntityAllowed(strapi, { type: 'admin::user', id: 1, data: {} } as never)
    ).toThrow(/admin::user/);
    expect(() =>
      assertRemoteLinkAllowed({
        kind: 'relation.basic',
        relation: 'oneToOne',
        left: { type: 'api::article.article', ref: 1, field: 'author' },
        right: { type: 'admin::user', ref: 1 },
      })
    ).toThrow(/admin::user/);
    expect(() =>
      assertRemoteLinkAllowed({
        kind: 'relation.basic',
        relation: 'oneToOne',
        left: { type: 'admin::role', ref: 1, field: 'users' },
        right: { type: 'api::article.article', ref: 1 },
      })
    ).toThrow(/admin::role/);
  });

  test('rejects protected static and nested component relation payloads without rejecting ordinary fields', () => {
    const strapi = createStrapi();

    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: { permissions: [1] },
      } as never)
    ).toThrow(/admin::permission/);
    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: { block: { permissions: [1] } },
      } as never)
    ).toThrow(/admin::permission/);
    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: { blocks: [{ __component: 'shared.block', permissions: [1] }] },
      } as never)
    ).toThrow(/admin::permission/);
    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: { title: 'ordinary transfer data' },
      } as never)
    ).not.toThrow();
  });

  test('rejects protected owner relation join-column aliases from destination metadata', () => {
    const strapi = createStrapi();

    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: { created_by_id: 1 },
      } as never)
    ).toThrow(/admin::user/);
  });

  test('accepts the captured official creator payload without creator relation fields', () => {
    const strapi = createStrapi();

    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: {
          title: 'ordinary official source entry',
          block: null,
          createdAt: '2026-08-10T00:00:00.000Z',
          updatedAt: '2026-08-10T00:00:00.000Z',
          publishedAt: '2026-08-10T00:00:00.000Z',
          documentId: 'cms1198-document-id',
          locale: null,
        },
      } as never)
    ).not.toThrow();
  });

  test('accepts dynamic-zone payloads using their logical schema instead of morph storage metadata', () => {
    const strapi = createStrapi();

    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: { blocks: [{ __component: 'shared.block' }] },
      } as never)
    ).not.toThrow();
  });

  test('rejects protected polymorphic discriminators and malformed supplied dynamic-zone components', () => {
    const strapi = createStrapi();

    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: { related: [{ id: 1, __type: 'admin::user' }] },
      } as never)
    ).toThrow(/admin::user/);
    expect(() =>
      assertRemoteEntityAllowed(strapi, {
        type: 'api::article.article',
        id: 1,
        data: { blocks: [{ permissions: [1] }] },
      } as never)
    ).toThrow(/dynamic zone/i);
  });
});
