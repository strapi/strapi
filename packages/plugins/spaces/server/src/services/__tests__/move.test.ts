import { moveToSpace } from '../move';

const ARTICLE_UID = 'api::article.article' as any;

const spaceScopedCT = {
  uid: ARTICLE_UID,
  pluginOptions: { spaces: { scope: 'space' } },
};

const localizedSpaceScopedCT = {
  uid: ARTICLE_UID,
  pluginOptions: { spaces: { scope: 'space' }, i18n: { localized: true } },
};

const sharedCT = {
  uid: ARTICLE_UID,
  pluginOptions: { spaces: { scope: 'space', sharedEntries: true } },
};

const ACME = { id: 2, slug: 'acme' };
const DEFAULT = { id: 1, slug: 'default' };

interface MockOptions {
  contentType?: any;
  /** The caller's workspace; `undefined` = no header. */
  space?: { id: number; slug: string };
  hasI18nPlugin?: boolean;
  targetSpace?: any;
  isVisibleInTarget?: boolean;
  rows?: any[];
  localeRowsInTarget?: any[];
}

const buildMocks = ({
  contentType = spaceScopedCT,
  space,
  hasI18nPlugin = false,
  targetSpace = { id: 2, slug: 'acme', status: 'active' },
  isVisibleInTarget = true,
  rows = [],
  localeRowsInTarget = [],
}: MockOptions = {}) => {
  const updateMany = jest.fn().mockResolvedValue({ count: rows.length });
  const findMany = jest.fn().mockResolvedValue(rows);
  const localeFindMany = jest.fn().mockResolvedValue(localeRowsInTarget);

  const services: Record<string, any> = {
    'content-types': {
      isSpaceScopedContentType: (m: any) => m?.pluginOptions?.spaces?.scope === 'space',
    },
    spaces: {
      getBySlug: jest.fn().mockResolvedValue(targetSpace),
    },
    visibility: {
      isCTVisibleInSpace: jest.fn().mockReturnValue(isVisibleInTarget),
    },
    inheritance: {
      // No workspace holds a copy of these entries unless a test says so.
      overridingSpaceIds: jest.fn().mockResolvedValue([]),
      promoteOverrides: jest.fn().mockResolvedValue(0),
    },
  };

  const strapi = {
    requestContext: {
      get: () => (space ? { state: { spaceId: space.id, spaceSlug: space.slug } } : undefined),
    },
    contentTypes: contentType ? { [ARTICLE_UID]: contentType } : {},
    // The repo-wide jest setup (tests/setup/unit.setup.js) rebuilds `strapi.plugin`
    // from this `plugins` map when the global is assigned below.
    plugins: {
      spaces: { services },
      ...(hasI18nPlugin ? { i18n: { services: {} } } : {}),
    },
    db: {
      query: jest.fn((uid: string) =>
        uid === 'plugin::i18n.locale' ? { findMany: localeFindMany } : { findMany, updateMany }
      ),
      transaction: jest.fn(async (cb: () => Promise<unknown>) => cb()),
    },
  } as any;

  // `getService` (server/src/utils) resolves through the global strapi.
  (global as any).strapi = strapi;

  return { strapi, services, updateMany, findMany, localeFindMany };
};

describe('moveToSpace', () => {
  it('rejects an empty documentIds list', async () => {
    const { strapi } = buildMocks();

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: [], targetSpaceSlug: 'acme' })
    ).rejects.toThrow('At least one documentId is required');
  });

  it('rejects an unknown content type', async () => {
    const { strapi } = buildMocks({ contentType: null });

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'acme' })
    ).rejects.toThrow(`Unknown content type: ${ARTICLE_UID}`);
  });

  it('rejects a content type that is not space-scoped', async () => {
    const { strapi } = buildMocks({
      contentType: { uid: ARTICLE_UID, pluginOptions: {} },
    });

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'acme' })
    ).rejects.toThrow('is not space-scoped');
  });

  it('rejects an unknown target space', async () => {
    const { strapi } = buildMocks({ targetSpace: null });

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'nope' })
    ).rejects.toThrow('Unknown or inactive space: nope');
  });

  it('rejects an archived target space', async () => {
    const { strapi } = buildMocks({
      targetSpace: { id: 2, slug: 'acme', status: 'archived' },
    });

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'acme' })
    ).rejects.toThrow('Unknown or inactive space: acme');
  });

  it('rejects when the CT is not visible in the target space', async () => {
    const { strapi } = buildMocks({ isVisibleInTarget: false });

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'acme' })
    ).rejects.toThrow('is not visible in space "acme"');
  });

  it('returns movedCount 0 without writing when no rows match', async () => {
    const { strapi, updateMany } = buildMocks({ rows: [] });

    const result = await moveToSpace(strapi, {
      uid: ARTICLE_UID,
      documentIds: ['a'],
      targetSpaceSlug: 'acme',
    });

    expect(result).toEqual({ movedCount: 0, targetSpaceId: 2, documentIds: ['a'] });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('moves every matched row with one bulk update inside a transaction', async () => {
    const rows = [
      { id: 10, documentId: 'a' },
      { id: 11, documentId: 'a' }, // draft + published rows share a documentId
      { id: 12, documentId: 'b' },
    ];
    const { strapi, updateMany } = buildMocks({ rows });

    const result = await moveToSpace(strapi, {
      uid: ARTICLE_UID,
      documentIds: ['a', 'b'],
      targetSpaceSlug: 'acme',
    });

    expect(strapi.db.transaction).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { $in: [10, 11, 12] } },
      data: { space: 2 },
    });
    expect(result).toEqual({ movedCount: 3, targetSpaceId: 2, documentIds: ['a', 'b'] });
  });

  it('rejects a move that would orphan a locale not available in the target space', async () => {
    const rows = [
      { id: 10, documentId: 'a', locale: 'en' },
      { id: 11, documentId: 'a', locale: 'fr' },
    ];
    const { strapi, updateMany } = buildMocks({
      contentType: localizedSpaceScopedCT,
      hasI18nPlugin: true,
      rows,
      // Only `en` is available in the target space.
      localeRowsInTarget: [{ code: 'en' }],
    });

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'acme' })
    ).rejects.toThrow('does not support locale(s) "fr"');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('moves localized rows when every source locale is available in the target', async () => {
    const rows = [
      { id: 10, documentId: 'a', locale: 'en' },
      { id: 11, documentId: 'a', locale: 'fr' },
    ];
    const { strapi, updateMany, localeFindMany } = buildMocks({
      contentType: localizedSpaceScopedCT,
      hasI18nPlugin: true,
      rows,
      localeRowsInTarget: [{ code: 'en' }, { code: 'fr' }],
    });

    const result = await moveToSpace(strapi, {
      uid: ARTICLE_UID,
      documentIds: ['a'],
      targetSpaceSlug: 'acme',
    });

    expect(localeFindMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(result.movedCount).toBe(2);
    expect(result.documentIds).toEqual(['a']);
  });

  it('shares entries with every workspace when the target is null', async () => {
    const rows = [
      { id: 10, documentId: 'a', space: { id: 1 } },
      { id: 11, documentId: 'b', space: { id: 2 } },
    ];
    const { strapi, services, updateMany, localeFindMany } = buildMocks({
      contentType: localizedSpaceScopedCT,
      hasI18nPlugin: true,
      space: DEFAULT,
      rows,
    });

    const result = await moveToSpace(strapi, {
      uid: ARTICLE_UID,
      documentIds: ['a', 'b'],
      targetSpaceSlug: null,
    });

    expect(services.spaces.getBySlug).not.toHaveBeenCalled();
    expect(localeFindMany).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { $in: [10, 11] } },
      data: { space: null },
    });
    expect(result).toEqual({ movedCount: 2, targetSpaceId: null, documentIds: ['a', 'b'] });
  });

  it('refuses to move entries of a shared content type', async () => {
    const { strapi, updateMany } = buildMocks({ contentType: sharedCT, space: DEFAULT });

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'acme' })
    ).rejects.toMatchObject({ name: 'WorkspaceAccessError' });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('refuses sharing from a sub-workspace', async () => {
    const { strapi, updateMany } = buildMocks({ space: ACME, rows: [{ id: 10, documentId: 'a' }] });

    await expect(
      moveToSpace(strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: null })
    ).rejects.toThrow('Only the default workspace can share entries');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('lets a sub-workspace move only its own rows', async () => {
    const own = buildMocks({
      space: ACME,
      targetSpace: { id: 3, slug: 'globex', status: 'active' },
      rows: [{ id: 10, documentId: 'a', space: { id: 2 } }],
    });
    await expect(
      moveToSpace(own.strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'globex' })
    ).resolves.toMatchObject({ movedCount: 1, targetSpaceId: 3 });

    const shared = buildMocks({
      space: ACME,
      targetSpace: { id: 3, slug: 'globex', status: 'active' },
      rows: [{ id: 10, documentId: 'a', space: null }],
    });
    await expect(
      moveToSpace(shared.strapi, {
        uid: ARTICLE_UID,
        documentIds: ['a'],
        targetSpaceSlug: 'globex',
      })
    ).rejects.toMatchObject({ name: 'WorkspaceAccessError' });
    expect(shared.updateMany).not.toHaveBeenCalled();

    const other = buildMocks({
      space: ACME,
      targetSpace: { id: 3, slug: 'globex', status: 'active' },
      rows: [{ id: 10, documentId: 'a', space: { id: 1 } }],
    });
    await expect(
      moveToSpace(other.strapi, { uid: ARTICLE_UID, documentIds: ['a'], targetSpaceSlug: 'globex' })
    ).rejects.toMatchObject({ name: 'NotFoundError' });
    expect(other.updateMany).not.toHaveBeenCalled();
  });

  it('lets the default workspace move any row', async () => {
    const { strapi, updateMany } = buildMocks({
      space: DEFAULT,
      rows: [
        { id: 10, documentId: 'a', space: { id: 3 } },
        { id: 11, documentId: 'b', space: null },
      ],
    });

    await moveToSpace(strapi, {
      uid: ARTICLE_UID,
      documentIds: ['a', 'b'],
      targetSpaceSlug: 'acme',
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { $in: [10, 11] } },
      data: { space: 2 },
    });
  });
});
