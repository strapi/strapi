import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID } from './utils';

type ApiEntry = {
  documentId: string;
  locale: string;
  publishedAt: string | null;
  title?: string;
};

type PublicationFilter = 'never-published' | 'has-published-version' | 'modified' | 'unmodified';
type Status = 'draft' | 'published';

let strapi: Core.Strapi;
let rqContent: (options: {
  method: string;
  url: string;
  qs?: Record<string, unknown>;
}) => Promise<{ statusCode: number; body: { data?: ApiEntry[]; errors?: unknown } }>;

const PF_PREFIX = 'PF-';

const toPairKey = (entry: Pick<ApiEntry, 'documentId' | 'locale'>) =>
  `${entry.documentId}:${entry.locale}`;

const sortKeys = (keys: string[]) => [...keys].sort();

const assertExactRows = (rows: ApiEntry[], expectedPairs: string[], expectedStatus: Status) => {
  const actualPairs = sortKeys(rows.map(toPairKey));
  expect(actualPairs).toEqual(sortKeys(expectedPairs));

  rows.forEach((row) => {
    if (expectedStatus === 'draft') {
      expect(row.publishedAt).toBeNull();
    } else {
      expect(row.publishedAt).not.toBeNull();
    }
  });
};

const findArticles = async (params: Record<string, unknown>) => {
  return (await strapi.documents(ARTICLE_UID).findMany(params as any)) as unknown as ApiEntry[];
};

/** Only rows created in this suite (ignores shared fixture articles). */
const corpusFilters = (corpusDocumentIds: string[]) => ({
  $and: [{ documentId: { $in: corpusDocumentIds } }, { title: { $startsWith: PF_PREFIX } }],
});

const mergeFilters = (
  corpusDocumentIds: string[],
  extra?: Record<string, unknown>
): Record<string, unknown> => {
  const base = corpusFilters(corpusDocumentIds);
  if (!extra || Object.keys(extra).length === 0) {
    return base;
  }
  return { $and: [extra, base] };
};

const findPfArticles = async (
  params: Record<string, unknown>,
  corpusDocumentIds: string[]
): Promise<ApiEntry[]> => {
  const { filters: extraFilters, ...rest } = params;
  return findArticles({
    locale: '*',
    ...rest,
    filters: mergeFilters(corpusDocumentIds, extraFilters as Record<string, unknown> | undefined),
  });
};

/** REST query: corpus documentId $in + title prefix inside $and (nested shape for qs.stringify). */
const buildPublicationFilterRestQs = (
  corpusDocumentIds: string[],
  publicationFilter: PublicationFilter | undefined,
  status: Status | undefined
): Record<string, unknown> => {
  const query: Record<string, unknown> = {
    locale: '*',
    filters: {
      $and: [
        { documentId: { $in: [...corpusDocumentIds] } },
        { title: { $startsWith: PF_PREFIX } },
      ],
    },
  };

  if (status) {
    query.status = status;
  }
  if (publicationFilter) {
    query.publicationFilter = publicationFilter;
  }

  return query;
};

const getPfArticlesRest = async (
  status: Status | undefined,
  publicationFilter: PublicationFilter | undefined,
  corpusDocumentIds: string[]
): Promise<ApiEntry[]> => {
  const res = await rqContent({
    method: 'GET',
    url: '/articles',
    qs: buildPublicationFilterRestQs(corpusDocumentIds, publicationFilter, status),
  });

  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);

  return (res.body.data ?? []) as ApiEntry[];
};

describe('Document Service - publicationFilter', () => {
  let testUtils: any;

  let neverPublishedId: string;
  let modifiedId: string;
  let unmodifiedId: string;
  let mixedId: string;

  let noiseNeverOnlyId: string;
  let noiseModifiedId: string;
  let noiseUnmodifiedId: string;
  let partialLocaleId: string;
  let splitLocaleId: string;
  /** Published row exists for EN but draft row removed (data-shape edge case). */
  let orphanPublishedOnlyId: string;
  /** Third locale (es) — never published; catches locale column dropped in subqueries. */
  let esOnlyNeverId: string;
  /** EN + NL both modified after publish; catches documentId-only merge dropping a locale. */
  let bothLocalesModifiedId: string;
  /** EN published+unmodified, NL draft-only (inverse of splitLocale shape). */
  let inverseSplitId: string;

  let corpusDocumentIds: string[];

  const expected = {
    neverPublishedPairs: [] as string[],
    hasPublishedPairsDraft: [] as string[],
    hasPublishedPairsPublished: [] as string[],
    modifiedPairs: [] as string[],
    unmodifiedPairs: [] as string[],
  };

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;

    const { createContentAPIRequest } = require('api-tests/request');
    rqContent = await createContentAPIRequest({ strapi });

    const neverDraftEn = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Never-EN' },
    })) as unknown as ApiEntry;
    neverPublishedId = neverDraftEn.documentId;

    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: neverPublishedId,
      locale: 'nl',
      data: { title: 'PF-Never-NL' },
    } as any);

    const noiseNever = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Noise-Never-Only-EN' },
    })) as unknown as ApiEntry;
    noiseNeverOnlyId = noiseNever.documentId;

    const modifiedDraft = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Modified-EN-v1' },
    })) as unknown as ApiEntry;
    modifiedId = modifiedDraft.documentId;
    await strapi.documents(ARTICLE_UID).publish({ documentId: modifiedId, locale: 'en' });
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: modifiedId,
      locale: 'en',
      data: { title: 'PF-Modified-EN-v2' },
    } as any);

    const noiseModDraft = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Noise-Modified-v1' },
    })) as unknown as ApiEntry;
    noiseModifiedId = noiseModDraft.documentId;
    await strapi.documents(ARTICLE_UID).publish({ documentId: noiseModifiedId, locale: 'en' });
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: noiseModifiedId,
      locale: 'en',
      data: { title: 'PF-Noise-Modified-v2' },
    } as any);

    const unmodifiedDraft = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Unmodified-EN-v1' },
    })) as unknown as ApiEntry;
    unmodifiedId = unmodifiedDraft.documentId;
    await strapi.documents(ARTICLE_UID).publish({ documentId: unmodifiedId, locale: 'en' });

    const noiseUnmodDraft = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Noise-Unmodified-v1' },
    })) as unknown as ApiEntry;
    noiseUnmodifiedId = noiseUnmodDraft.documentId;
    await strapi.documents(ARTICLE_UID).publish({ documentId: noiseUnmodifiedId, locale: 'en' });

    const mixedDraftEn = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Mixed-EN-v1' },
    })) as unknown as ApiEntry;
    mixedId = mixedDraftEn.documentId;
    await strapi.documents(ARTICLE_UID).publish({ documentId: mixedId, locale: 'en' });
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: mixedId,
      locale: 'en',
      data: { title: 'PF-Mixed-EN-v2' },
    } as any);

    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: mixedId,
      locale: 'nl',
      data: { title: 'PF-Mixed-NL-v1' },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: mixedId, locale: 'nl' });

    const partial = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Partial-EN-v1' },
    })) as unknown as ApiEntry;
    partialLocaleId = partial.documentId;
    await strapi.documents(ARTICLE_UID).publish({ documentId: partialLocaleId, locale: 'en' });
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: partialLocaleId,
      locale: 'en',
      data: { title: 'PF-Partial-EN-v2' },
    } as any);
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: partialLocaleId,
      locale: 'nl',
      data: { title: 'PF-Partial-NL-Draft-Only' },
    } as any);

    const split = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Split-EN-Never' },
    })) as unknown as ApiEntry;
    splitLocaleId = split.documentId;
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: splitLocaleId,
      locale: 'nl',
      data: { title: 'PF-Split-NL-v1' },
    } as any);
    await strapi.documents(ARTICLE_UID).publish({ documentId: splitLocaleId, locale: 'nl' });

    const orphanDraft = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Orphan-Published-Only-EN' },
    })) as unknown as ApiEntry;
    orphanPublishedOnlyId = orphanDraft.documentId;
    await strapi
      .documents(ARTICLE_UID)
      .publish({ documentId: orphanPublishedOnlyId, locale: 'en' });

    const draftToDelete = await strapi.db.query(ARTICLE_UID).findOne({
      where: {
        documentId: orphanPublishedOnlyId,
        locale: 'en',
        publishedAt: null,
      },
    });
    if (!draftToDelete?.id) {
      throw new Error('Expected draft row to delete for orphan published-only fixture');
    }
    await strapi.db.query(ARTICLE_UID).delete({ where: { id: draftToDelete.id } });

    const esOnlyDraft = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'es',
      data: { title: 'PF-Es-Only-Never' },
    })) as unknown as ApiEntry;
    esOnlyNeverId = esOnlyDraft.documentId;

    const bothModDraftEn = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-BothMod-EN-v1' },
    })) as unknown as ApiEntry;
    bothLocalesModifiedId = bothModDraftEn.documentId;
    await strapi
      .documents(ARTICLE_UID)
      .publish({ documentId: bothLocalesModifiedId, locale: 'en' });
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: bothLocalesModifiedId,
      locale: 'en',
      data: { title: 'PF-BothMod-EN-v2' },
    } as any);
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: bothLocalesModifiedId,
      locale: 'nl',
      data: { title: 'PF-BothMod-NL-v1' },
    } as any);
    await strapi
      .documents(ARTICLE_UID)
      .publish({ documentId: bothLocalesModifiedId, locale: 'nl' });
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: bothLocalesModifiedId,
      locale: 'nl',
      data: { title: 'PF-BothMod-NL-v2' },
    } as any);

    const inverseEn = (await strapi.documents(ARTICLE_UID).create({
      status: 'draft',
      locale: 'en',
      data: { title: 'PF-Inverse-EN-v1' },
    })) as unknown as ApiEntry;
    inverseSplitId = inverseEn.documentId;
    await strapi.documents(ARTICLE_UID).publish({ documentId: inverseSplitId, locale: 'en' });
    await strapi.documents(ARTICLE_UID).update({
      status: 'draft',
      documentId: inverseSplitId,
      locale: 'nl',
      data: { title: 'PF-Inverse-NL-Draft-Only' },
    } as any);

    corpusDocumentIds = [
      neverPublishedId,
      noiseNeverOnlyId,
      modifiedId,
      noiseModifiedId,
      unmodifiedId,
      noiseUnmodifiedId,
      mixedId,
      partialLocaleId,
      splitLocaleId,
      orphanPublishedOnlyId,
      esOnlyNeverId,
      bothLocalesModifiedId,
      inverseSplitId,
    ];

    expected.neverPublishedPairs = sortKeys([
      `${neverPublishedId}:en`,
      `${neverPublishedId}:nl`,
      `${noiseNeverOnlyId}:en`,
      `${splitLocaleId}:en`,
      `${partialLocaleId}:nl`,
      `${esOnlyNeverId}:es`,
      `${inverseSplitId}:nl`,
    ]);

    expected.hasPublishedPairsDraft = sortKeys([
      `${modifiedId}:en`,
      `${noiseModifiedId}:en`,
      `${unmodifiedId}:en`,
      `${noiseUnmodifiedId}:en`,
      `${mixedId}:en`,
      `${mixedId}:nl`,
      `${partialLocaleId}:en`,
      `${splitLocaleId}:nl`,
      `${bothLocalesModifiedId}:en`,
      `${bothLocalesModifiedId}:nl`,
      `${inverseSplitId}:en`,
    ]);

    expected.hasPublishedPairsPublished = sortKeys([
      `${modifiedId}:en`,
      `${noiseModifiedId}:en`,
      `${unmodifiedId}:en`,
      `${noiseUnmodifiedId}:en`,
      `${mixedId}:en`,
      `${mixedId}:nl`,
      `${partialLocaleId}:en`,
      `${splitLocaleId}:nl`,
      `${bothLocalesModifiedId}:en`,
      `${bothLocalesModifiedId}:nl`,
      `${inverseSplitId}:en`,
    ]);

    expected.modifiedPairs = sortKeys([
      `${modifiedId}:en`,
      `${noiseModifiedId}:en`,
      `${mixedId}:en`,
      `${partialLocaleId}:en`,
      `${bothLocalesModifiedId}:en`,
      `${bothLocalesModifiedId}:nl`,
    ]);

    expected.unmodifiedPairs = sortKeys([
      `${unmodifiedId}:en`,
      `${noiseUnmodifiedId}:en`,
      `${mixedId}:nl`,
      `${splitLocaleId}:nl`,
      `${inverseSplitId}:en`,
    ]);
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('document service findMany', () => {
    it.each([
      ['never-published', 'draft', () => expected.neverPublishedPairs],
      ['never-published', 'published', () => []],
      ['has-published-version', 'draft', () => expected.hasPublishedPairsDraft],
      ['has-published-version', 'published', () => expected.hasPublishedPairsPublished],
      ['modified', 'draft', () => expected.modifiedPairs],
      ['modified', 'published', () => expected.modifiedPairs],
      ['unmodified', 'draft', () => expected.unmodifiedPairs],
      ['unmodified', 'published', () => expected.unmodifiedPairs],
    ] as const)(
      'returns exact set for publicationFilter=%s with status=%s',
      async (publicationFilter, status, getExpected) => {
        const rows = await findPfArticles(
          {
            status,
            publicationFilter,
          } as any,
          corpusDocumentIds
        );

        assertExactRows(rows, getExpected(), status);
      }
    );

    it('inherits draft status by default when status is omitted', async () => {
      const rows = await findPfArticles(
        { publicationFilter: 'modified' } as any,
        corpusDocumentIds
      );

      assertExactRows(rows, expected.modifiedPairs, 'draft');
    });

    describe('cohort invariants (partition / locale safety)', () => {
      it('draft modified ∪ draft unmodified = draft has-published-version (disjoint union)', async () => {
        const mod = await findPfArticles(
          { status: 'draft', publicationFilter: 'modified' } as any,
          corpusDocumentIds
        );
        const un = await findPfArticles(
          { status: 'draft', publicationFilter: 'unmodified' } as any,
          corpusDocumentIds
        );
        const hp = await findPfArticles(
          { status: 'draft', publicationFilter: 'has-published-version' } as any,
          corpusDocumentIds
        );
        const modKeys = new Set(mod.map(toPairKey));
        const unKeys = new Set(un.map(toPairKey));
        expect([...modKeys].filter((k) => unKeys.has(k))).toEqual([]);
        expect(sortKeys([...modKeys, ...unKeys])).toEqual(sortKeys(hp.map(toPairKey)));
      });

      it('published modified ∪ published unmodified = published has-published-version (disjoint union)', async () => {
        const mod = await findPfArticles(
          { status: 'published', publicationFilter: 'modified' } as any,
          corpusDocumentIds
        );
        const un = await findPfArticles(
          { status: 'published', publicationFilter: 'unmodified' } as any,
          corpusDocumentIds
        );
        const hp = await findPfArticles(
          { status: 'published', publicationFilter: 'has-published-version' } as any,
          corpusDocumentIds
        );
        const modKeys = new Set(mod.map(toPairKey));
        const unKeys = new Set(un.map(toPairKey));
        expect([...modKeys].filter((k) => unKeys.has(k))).toEqual([]);
        expect(sortKeys([...modKeys, ...unKeys])).toEqual(sortKeys(hp.map(toPairKey)));
      });
    });

    describe('baseline vs filtered (must fail if publicationFilter is ignored)', () => {
      it('never-published draft is a strict subset of all drafts in corpus', async () => {
        const baseline = await findPfArticles({ status: 'draft' } as any, corpusDocumentIds);
        const filtered = await findPfArticles(
          { status: 'draft', publicationFilter: 'never-published' } as any,
          corpusDocumentIds
        );
        expect(filtered.length).toBeLessThan(baseline.length);
        assertExactRows(filtered, expected.neverPublishedPairs, 'draft');
      });

      it('has-published-version draft is a strict subset of all drafts in corpus', async () => {
        const baseline = await findPfArticles({ status: 'draft' } as any, corpusDocumentIds);
        const filtered = await findPfArticles(
          { status: 'draft', publicationFilter: 'has-published-version' } as any,
          corpusDocumentIds
        );
        expect(filtered.length).toBeLessThan(baseline.length);
        assertExactRows(filtered, expected.hasPublishedPairsDraft, 'draft');
      });

      it('modified draft is a strict subset of all drafts in corpus', async () => {
        const baseline = await findPfArticles({ status: 'draft' } as any, corpusDocumentIds);
        const filtered = await findPfArticles(
          { status: 'draft', publicationFilter: 'modified' } as any,
          corpusDocumentIds
        );
        expect(filtered.length).toBeLessThan(baseline.length);
        assertExactRows(filtered, expected.modifiedPairs, 'draft');
      });

      it('unmodified draft is a strict subset of all drafts in corpus', async () => {
        const baseline = await findPfArticles({ status: 'draft' } as any, corpusDocumentIds);
        const filtered = await findPfArticles(
          { status: 'draft', publicationFilter: 'unmodified' } as any,
          corpusDocumentIds
        );
        expect(filtered.length).toBeLessThan(baseline.length);
        assertExactRows(filtered, expected.unmodifiedPairs, 'draft');
      });

      it('never-published published is empty while baseline published is not', async () => {
        const baseline = await findPfArticles({ status: 'published' } as any, corpusDocumentIds);
        const filtered = await findPfArticles(
          { status: 'published', publicationFilter: 'never-published' } as any,
          corpusDocumentIds
        );
        expect(baseline.length).toBeGreaterThan(0);
        expect(filtered).toEqual([]);
      });

      it('has-published-version published is a strict superset of modified and unmodified published', async () => {
        const hp = await findPfArticles(
          { status: 'published', publicationFilter: 'has-published-version' } as any,
          corpusDocumentIds
        );
        const mod = await findPfArticles(
          { status: 'published', publicationFilter: 'modified' } as any,
          corpusDocumentIds
        );
        const un = await findPfArticles(
          { status: 'published', publicationFilter: 'unmodified' } as any,
          corpusDocumentIds
        );

        const baselinePublished = await findPfArticles(
          { status: 'published' } as any,
          corpusDocumentIds
        );

        assertExactRows(hp, expected.hasPublishedPairsPublished, 'published');
        expect(baselinePublished.length).toBeGreaterThan(hp.length);
        expect(hp.length).toBeGreaterThan(mod.length);
        expect(hp.length).toBeGreaterThan(un.length);
        expect(sortKeys(hp.map(toPairKey))).not.toEqual(sortKeys(mod.map(toPairKey)));
        expect(sortKeys(hp.map(toPairKey))).not.toEqual(sortKeys(un.map(toPairKey)));
      });

      it('rejects unknown publicationFilter values', async () => {
        await expect(
          findPfArticles(
            { status: 'draft', publicationFilter: 'not-a-real-filter' } as any,
            corpusDocumentIds
          )
        ).rejects.toThrow();
      });
    });
  });

  describe('REST API', () => {
    it.each([
      ['never-published', 'draft', () => expected.neverPublishedPairs],
      ['never-published', 'published', () => []],
      ['has-published-version', 'draft', () => expected.hasPublishedPairsDraft],
      ['has-published-version', 'published', () => expected.hasPublishedPairsPublished],
      ['modified', 'draft', () => expected.modifiedPairs],
      ['modified', 'published', () => expected.modifiedPairs],
      ['unmodified', 'draft', () => expected.unmodifiedPairs],
      ['unmodified', 'published', () => expected.unmodifiedPairs],
    ] as const)(
      'GET /api/articles returns exact set for publicationFilter=%s with status=%s',
      async (publicationFilter, status, getExpected) => {
        const rows = await getPfArticlesRest(status, publicationFilter, corpusDocumentIds);
        assertExactRows(rows, getExpected(), status);
      }
    );

    it('inherits published status by default when status is omitted', async () => {
      const rows = await getPfArticlesRest(undefined, 'modified', corpusDocumentIds);
      assertExactRows(rows, expected.modifiedPairs, 'published');
    });

    it('REST draft modified ∪ unmodified = has-published-version (same as document service)', async () => {
      const mod = await getPfArticlesRest('draft', 'modified', corpusDocumentIds);
      const un = await getPfArticlesRest('draft', 'unmodified', corpusDocumentIds);
      const hp = await getPfArticlesRest('draft', 'has-published-version', corpusDocumentIds);
      const modKeys = new Set(mod.map(toPairKey));
      const unKeys = new Set(un.map(toPairKey));
      expect([...modKeys].filter((k) => unKeys.has(k))).toEqual([]);
      expect(sortKeys([...modKeys, ...unKeys])).toEqual(sortKeys(hp.map(toPairKey)));
    });

    describe('baseline vs filtered (must fail if publicationFilter is ignored)', () => {
      it('never-published draft is a strict subset of all drafts in corpus', async () => {
        const baselineRows = await getPfArticlesRest('draft', undefined, corpusDocumentIds);
        const filteredRows = await getPfArticlesRest('draft', 'never-published', corpusDocumentIds);
        expect(filteredRows.length).toBeLessThan(baselineRows.length);
        assertExactRows(filteredRows, expected.neverPublishedPairs, 'draft');
      });

      it('has-published-version published is a strict superset of modified published', async () => {
        const baseline = await getPfArticlesRest('published', undefined, corpusDocumentIds);
        const hp = await getPfArticlesRest('published', 'has-published-version', corpusDocumentIds);
        const mod = await getPfArticlesRest('published', 'modified', corpusDocumentIds);
        expect(baseline.length).toBeGreaterThan(hp.length);
        expect(hp.length).toBeGreaterThan(mod.length);
        assertExactRows(hp, expected.hasPublishedPairsPublished, 'published');
        assertExactRows(mod, expected.modifiedPairs, 'published');
      });

      it('returns 400 for unknown publicationFilter', async () => {
        const res = await rqContent({
          method: 'GET',
          url: '/articles',
          qs: {
            ...buildPublicationFilterRestQs(corpusDocumentIds, undefined, 'draft'),
            publicationFilter: 'not-a-real-filter',
          },
        });
        expect(res.statusCode).toBe(400);
      });
    });
  });
});
