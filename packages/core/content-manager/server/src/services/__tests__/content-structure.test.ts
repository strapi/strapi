import type { Modules } from '@strapi/types';
import createContentStructureService from '../content-structure';

type ResolvedGroupNode = Modules.ContentStructure.ResolvedGroupNode;
type ResolvedContentStructure = Modules.ContentStructure.ResolvedContentStructure;

const group = (
  id: string,
  name: string,
  children: ResolvedGroupNode['children']
): ResolvedGroupNode => ({ type: 'group', id, name, children });

const ct = (uid: string) => ({ type: 'contentType' as const, uid: uid as any });

const visible = (uid: string) => ({ uid, kind: 'collectionType' });
const hidden = (uid: string) => ({
  uid,
  kind: 'collectionType',
  pluginOptions: { 'content-manager': { visible: false } },
});
const builderHidden = (uid: string) => ({
  uid,
  kind: 'collectionType',
  pluginOptions: { 'content-type-builder': { visible: false } },
});

const contentTypes: Record<string, unknown> = {
  'api::article.article': visible('api::article.article'),
  'api::page.page': visible('api::page.page'),
  'api::secret.secret': hidden('api::secret.secret'),
  'api::draft.draft': builderHidden('api::draft.draft'),
  'admin::user': visible('admin::user'),
  'admin::role': visible('admin::role'),
  'strapi::webhook': visible('strapi::webhook'),
  'strapi::core-store': visible('strapi::core-store'),
};

const makeService = (resolved: ResolvedContentStructure, cleaned: unknown = { version: 1 }) => {
  const coreService = {
    getCleanedFile: jest.fn(async () => cleaned),
    resolve: jest.fn(async () => resolved),
  };

  const strapi = {
    contentTypes,
    get: jest.fn((name: string) => (name === 'content-structure' ? coreService : undefined)),
  } as any;

  return { service: createContentStructureService({ strapi }), coreService };
};

describe('content-manager content-structure service', () => {
  it('returns null when there is no folder file', async () => {
    const { service, coreService } = makeService({ collectionTypes: [], singleTypes: [] }, null);

    await expect(service.getContentStructure()).resolves.toBeNull();
    expect(coreService.resolve).not.toHaveBeenCalled();
  });

  it('drops internal, hidden, and unknown content types but keeps visible ones', async () => {
    const resolved: ResolvedContentStructure = {
      collectionTypes: [
        group('grp_root', 'Root', [
          ct('api::article.article'), // visible → keep
          ct('api::secret.secret'), // hidden → drop
          ct('admin::user'), // internal → drop
          ct('strapi::webhook'), // internal → drop
          ct('api::ghost.ghost'), // unknown → drop
          group('grp_nested', 'Nested', [
            ct('admin::role'), // internal → drop
            ct('api::page.page'), // visible → keep
          ]),
          group('grp_empty', 'Empty', [
            ct('strapi::core-store'), // internal → drop, group kept but empty
          ]),
        ]),
      ],
      singleTypes: [],
    };

    const { service } = makeService(resolved);

    await expect(service.getContentStructure()).resolves.toEqual({
      collectionTypes: [
        group('grp_root', 'Root', [
          ct('api::article.article'),
          group('grp_nested', 'Nested', [ct('api::page.page')]),
          group('grp_empty', 'Empty', []),
        ]),
      ],
      singleTypes: [],
    });
  });

  it('prunes both sections independently', async () => {
    const resolved: ResolvedContentStructure = {
      collectionTypes: [
        group('grp_c', 'Collections', [ct('api::article.article'), ct('admin::user')]),
      ],
      singleTypes: [group('grp_s', 'Singles', [ct('strapi::webhook'), ct('api::page.page')])],
    };

    const { service } = makeService(resolved);

    await expect(service.getContentStructure()).resolves.toEqual({
      collectionTypes: [group('grp_c', 'Collections', [ct('api::article.article')])],
      singleTypes: [group('grp_s', 'Singles', [ct('api::page.page')])],
    });
  });

  it('keeps a type hidden in the builder but visible in the content manager', async () => {
    const resolved: ResolvedContentStructure = {
      collectionTypes: [
        group('grp_root', 'Root', [ct('api::article.article'), ct('api::draft.draft')]),
      ],
      singleTypes: [],
    };

    const { service } = makeService(resolved);

    await expect(service.getContentStructure()).resolves.toEqual({
      collectionTypes: [
        group('grp_root', 'Root', [ct('api::article.article'), ct('api::draft.draft')]),
      ],
      singleTypes: [],
    });
  });
});
