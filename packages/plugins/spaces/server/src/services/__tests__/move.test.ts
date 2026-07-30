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

interface MockOptions {
  contentType?: any;
  hasI18nPlugin?: boolean;
  targetSpace?: any;
  isVisibleInTarget?: boolean;
  rows?: any[];
  localeRowsInTarget?: any[];
}

const buildMocks = ({
  contentType = spaceScopedCT,
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
  };

  const strapi = {
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
});
