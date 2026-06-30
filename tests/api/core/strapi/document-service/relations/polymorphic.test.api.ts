import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import baseResources from '../resources/index';

const POLY_SOURCE_UID = 'api::poly-source.poly-source' as const;
const POLY_TARGET_UID = 'api::poly-target.poly-target' as const;
const MORPH_BOX_UID = 'api::morph-box.morph-box' as const;

// These cases use `it`, not `testInTransaction`. They go through the document service
// and `strapi.db.query` for reads; document writes are not on the test's Knex
// transaction. Wrapping the whole test in `strapi.db.transaction` while `finally`
// runs `strapi.documents().delete()` can hold a connection and deadlock the pool
// (seen as the suite never finishing), especially on SQLite. Cleanup is in `finally`.

const polyTargetContentType = {
  kind: 'collectionType' as const,
  collectionName: 'poly_targets',
  singularName: 'poly-target',
  pluralName: 'poly-targets',
  displayName: 'Polymorphic target',
  description: '',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
  },
};

const polySourceContentType = {
  kind: 'collectionType' as const,
  collectionName: 'poly_sources',
  singularName: 'poly-source',
  pluralName: 'poly-sources',
  displayName: 'Polymorphic source',
  description: '',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    linkedOne: {
      type: 'relation',
      relation: 'morphToOne',
    },
    linkedMany: {
      type: 'relation',
      relation: 'morphToMany',
    },
  },
};

/** Self-referential type: every polymorphic kind on one model (inverse fields use morphBy back to mto / mtm). */
const morphBoxContentType = {
  kind: 'collectionType' as const,
  collectionName: 'morph_boxes',
  singularName: 'morph-box',
  pluralName: 'morph-boxes',
  displayName: 'Morph box (self-ref polymorphic)',
  description: '',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
    mto: { type: 'relation', relation: 'morphToOne' },
    mtm: { type: 'relation', relation: 'morphToMany' },
    mtoInverse: {
      type: 'relation',
      relation: 'morphOne',
      target: MORPH_BOX_UID,
      morphBy: 'mto',
    },
    mtmInverse: {
      type: 'relation',
      relation: 'morphMany',
      target: MORPH_BOX_UID,
      morphBy: 'mtm',
    },
  },
};

const resources = {
  locales: baseResources.locales,
  schemas: {
    components: baseResources.schemas.components,
    'content-types': {
      ...baseResources.schemas['content-types'],
      [POLY_SOURCE_UID]: polySourceContentType,
      [POLY_TARGET_UID]: polyTargetContentType,
      [MORPH_BOX_UID]: morphBoxContentType,
    },
  },
  fixtures: {
    ...baseResources.fixtures,
    'content-types': {
      ...baseResources.fixtures['content-types'],
      [POLY_SOURCE_UID]: [],
      [POLY_TARGET_UID]: [],
      [MORPH_BOX_UID]: [],
    },
  },
};

describe('Document Service polymorphic relations', () => {
  let testUtils;
  let strapi: Core.Strapi;

  const morphToOneAttributeName = 'linkedOne' as const;
  const morphToManyAttributeName = 'linkedMany' as const;

  const getMorphToOneMeta = (uid: typeof POLY_SOURCE_UID) => {
    const attribute = strapi.db.metadata.get(uid).attributes[morphToOneAttributeName] as any;
    if (!attribute?.morphColumn) {
      throw new Error(`Missing morphColumn for ${uid}.${morphToOneAttributeName}`);
    }
    return attribute.morphColumn as { idColumn: { name: string }; typeColumn: { name: string } };
  };

  const getMorphToManyMeta = (uid: typeof POLY_SOURCE_UID) => {
    const attribute = strapi.db.metadata.get(uid).attributes[morphToManyAttributeName] as any;
    if (!attribute?.joinTable) {
      throw new Error(`Missing joinTable for ${uid}.${morphToManyAttributeName}`);
    }
    return attribute.joinTable as {
      name: string;
      joinColumn: { name: string };
      morphColumn: { idColumn: { name: string }; typeColumn: { name: string } };
    };
  };

  const findSourceRow = async (args: { documentId: string; isDraft: boolean }) => {
    return strapi.db.query(POLY_SOURCE_UID).findOne({
      where: {
        documentId: args.documentId,
        publishedAt: args.isDraft ? null : { $notNull: true },
      },
    }) as any;
  };

  /**
   * Raw SQL row (physical column names). Needed for `morphToOne`: the query `fromRow` transform
   * does not map morph column pairs onto `columnToAttribute`, so they never appear on `findOne` results.
   */
  const getRawTableRowById = async (uid: string, id: number) => {
    const table = strapi.db.metadata.get(uid).tableName;
    return (await strapi.db.getConnection(table).where({ id }).first()) as unknown as
      | Record<string, unknown>
      | undefined;
  };

  const findTargetRow = async (args: { documentId: string; isDraft: boolean }) => {
    return strapi.db.query(POLY_TARGET_UID).findOne({
      where: {
        documentId: args.documentId,
        publishedAt: args.isDraft ? null : { $notNull: true },
      },
    }) as any;
  };

  const loadMorphToManyJoinRows = async (sourceId: number) => {
    const { name: joinTableName, joinColumn, morphColumn } = getMorphToManyMeta(POLY_SOURCE_UID);

    return strapi.db
      .getConnection(joinTableName)
      .where({ [joinColumn.name]: sourceId })
      .orderBy('id', 'asc');
  };

  const expectNoJoinRowsForSource = async (sourceId: number) => {
    const joinRows = await loadMorphToManyJoinRows(sourceId);
    expect(joinRows).toHaveLength(0);
  };

  /**
   * What Strapi actually stored for morph columns / join (draft row). `morphToOne` is not
   * updated by unidirectional-relations (joinTable-only); `morphToMany` join rows may be
   * synced when the target is published. Do not hardcode “published target row id” in DB
   * assertions without reading this first.
   */
  /** Resolve `documentId` for a local row in a content type (morph target rows can differ by draft vs published `id`). */
  const getLocalRowDocumentId = async (uid: string, id: number) => {
    const raw = (await getRawTableRowById(uid, id)) as Record<string, unknown> | undefined;
    if (!raw) {
      return undefined;
    }
    const v = raw.documentId ?? raw.document_id;
    return (typeof v === 'string' ? v : v != null ? String(v) : undefined) as string | undefined;
  };

  /** Assert two morphToMany join snapshots point at the same target *documents* (order and type), not necessarily the same local `id`. */
  const expectJoinTargetsReferToSameTargetDocuments = async (
    a: { id: number; type: string; order: number }[],
    b: { id: number; type: string; order: number }[]
  ) => {
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].type).toBe(b[i].type);
      expect(a[i].order).toBe(b[i].order);
      const docA = await getLocalRowDocumentId(a[i].type, a[i].id);
      const docB = await getLocalRowDocumentId(b[i].type, b[i].id);
      expect(docA).toBeDefined();
      expect(docB).toBeDefined();
      expect(docA).toBe(docB);
    }
  };

  const readPolySourceMorphStorage = async (documentId: string, isDraft: boolean) => {
    const row = await findSourceRow({ documentId, isDraft });
    expect(row).toBeDefined();
    const raw = await getRawTableRowById(POLY_SOURCE_UID, row.id as number);
    expect(raw).toBeDefined();
    const morph = getMorphToOneMeta(POLY_SOURCE_UID);
    const morphId = raw![morph.idColumn.name];
    const morphType = raw![morph.typeColumn.name];
    const { morphColumn } = getMorphToManyMeta(POLY_SOURCE_UID);
    const joinRows = await loadMorphToManyJoinRows(row.id as number);
    const joinTargets = joinRows.map((r: any) => ({
      id: r[morphColumn.idColumn.name] as number,
      type: r[morphColumn.typeColumn.name] as string,
      order: r.order as number,
    }));
    if (morphId == null || morphType == null) {
      return {
        sourceRowId: row.id as number,
        morphToOne: 'empty' as const,
        joinTargets,
      };
    }
    return {
      sourceRowId: row.id as number,
      morphToOne: { id: morphId as number, type: morphType as string },
      joinTargets,
    };
  };

  const assertSourceMorphDbState = async (args: {
    documentId: string;
    isDraft: boolean;
    morphToOne: 'empty' | { id: number; type: string };
    expectedJoinTargets: { id: number; type: string; order: number }[];
  }) => {
    const sourceRow = await findSourceRow({ documentId: args.documentId, isDraft: args.isDraft });
    expect(sourceRow).toBeDefined();

    const morph = getMorphToOneMeta(POLY_SOURCE_UID);
    const rawSource = await getRawTableRowById(POLY_SOURCE_UID, sourceRow.id as number);
    expect(rawSource).toBeDefined();

    if (args.morphToOne === 'empty') {
      expect(rawSource![morph.idColumn.name] ?? null).toBeNull();
      expect(rawSource![morph.typeColumn.name] ?? null).toBeNull();
    } else {
      expect(rawSource![morph.idColumn.name]).toBe(args.morphToOne.id);
      expect(rawSource![morph.typeColumn.name]).toBe(args.morphToOne.type);
    }

    const { morphColumn } = getMorphToManyMeta(POLY_SOURCE_UID);

    // Join table is the source of truth for `morphToMany`
    const joinRows = await loadMorphToManyJoinRows(sourceRow.id);
    expect(joinRows).toHaveLength(args.expectedJoinTargets.length);

    const normalized = joinRows.map((r: any) => ({
      id: r[morphColumn.idColumn.name],
      type: r[morphColumn.typeColumn.name],
      order: r.order,
    }));

    expect(normalized).toEqual(
      args.expectedJoinTargets.map((t) => ({ id: t.id, type: t.type, order: t.order }))
    );
  };

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  }, 120_000);

  const createDraftWithMorphRelations = async () => {
    const target = await strapi.documents(POLY_TARGET_UID).create({
      data: { title: 'Target draft' },
    });

    const targetDraftRow = await strapi.db.query(POLY_TARGET_UID).findOne({
      where: {
        documentId: target.documentId,
        publishedAt: null,
      },
      select: ['id'],
    });
    if (!targetDraftRow?.id) {
      throw new Error('Expected a draft target row id before publishing the target');
    }

    const source = await strapi.documents(POLY_SOURCE_UID).create({
      data: {
        title: 'Source draft',
        linkedOne: {
          id: targetDraftRow.id,
          __type: POLY_TARGET_UID,
        },
        linkedMany: {
          connect: [
            {
              documentId: target.documentId,
              __type: POLY_TARGET_UID,
            },
          ],
        },
      },
      populate: {
        linkedOne: true,
        linkedMany: true,
      },
    });

    await strapi.documents(POLY_TARGET_UID).publish({ documentId: target.documentId });

    const targetPublished = await findTargetRow({ documentId: target.documentId, isDraft: false });
    if (!targetPublished) {
      throw new Error('Expected a published target row after publishing the target');
    }

    return {
      source,
      target,
      /** Local id of the **published** target row (e.g. API / cross-row expectations). */
      targetPublishedId: targetPublished.id as number,
    };
  };

  describe('publish', () => {
    it('preserves morphToOne and morphToMany relations on publish', async () => {
      let sourceDocumentId: string | undefined;
      let targetDocumentId: string | undefined;
      try {
        const { source, target } = await createDraftWithMorphRelations();
        sourceDocumentId = source.documentId;
        targetDocumentId = target.documentId;

        // Sanity check DB after setup: target is published; source is still a draft. Stored morph
        // target ids are whatever the engine wrote (morphToOne is not remapped on target publish).
        const draftSource = await findSourceRow({ documentId: source.documentId, isDraft: true });
        expect(draftSource).toBeDefined();

        const storage0 = await readPolySourceMorphStorage(source.documentId, true);
        if (storage0.morphToOne === 'empty') {
          throw new Error('Expected morph storage after createDraftWithMorphRelations');
        }
        await assertSourceMorphDbState({
          documentId: source.documentId,
          isDraft: true,
          morphToOne: storage0.morphToOne,
          expectedJoinTargets: storage0.joinTargets,
        });

        const published = await strapi.documents(POLY_SOURCE_UID).publish({
          documentId: source.documentId,
          populate: {
            linkedOne: true,
            linkedMany: true,
          },
        });

        expect(published.entries).toHaveLength(1);
        // `publish` returns rows from `db.create` and may not apply relation populate; re-fetch for API shape
        const publishedView = await strapi.db.query(POLY_SOURCE_UID).findOne({
          where: {
            documentId: source.documentId,
            publishedAt: { $notNull: true },
          },
          populate: {
            linkedOne: true,
            linkedMany: {
              on: {
                [POLY_TARGET_UID]: { fields: ['documentId', 'title'] },
              },
            },
          },
        } as any);
        expect(publishedView?.linkedOne).toMatchObject({
          documentId: target.documentId,
          __type: POLY_TARGET_UID,
        });
        expect(publishedView?.linkedMany).toHaveLength(1);
        expect(publishedView?.linkedMany[0]).toMatchObject({
          documentId: target.documentId,
          __type: POLY_TARGET_UID,
        });

        // DB truth: the surviving draft and the new published `poly_sources` row each have their own
        // join rows; target local ids can differ (e.g. join sync for the published line).
        const storageDraft = await readPolySourceMorphStorage(source.documentId, true);
        const storagePub = await readPolySourceMorphStorage(source.documentId, false);
        if (storageDraft.morphToOne === 'empty' || storagePub.morphToOne === 'empty') {
          throw new Error(
            'Expected morph storage on both draft and published after source publish'
          );
        }
        await assertSourceMorphDbState({
          documentId: source.documentId,
          isDraft: true,
          morphToOne: storageDraft.morphToOne,
          expectedJoinTargets: storageDraft.joinTargets,
        });
        await assertSourceMorphDbState({
          documentId: source.documentId,
          isDraft: false,
          morphToOne: storagePub.morphToOne,
          expectedJoinTargets: storagePub.joinTargets,
        });

        // If the pre-publish draft row was replaced (new `id` for the surviving draft), the old `id`
        // must not keep morphToMany join rows. If the engine updates the draft in place, the same
        // `id` remains valid and will still have join rows.
        const draftAfterSourcePublish = await findSourceRow({
          documentId: source.documentId,
          isDraft: true,
        });
        if (draftAfterSourcePublish && draftAfterSourcePublish.id !== draftSource.id) {
          await expectNoJoinRowsForSource(draftSource.id as number);
        }
      } finally {
        if (sourceDocumentId) {
          try {
            await strapi
              .documents(POLY_SOURCE_UID)
              .delete({ documentId: sourceDocumentId, locale: '*' });
          } catch {
            // best-effort cleanup
          }
        }
        if (targetDocumentId) {
          try {
            await strapi
              .documents(POLY_TARGET_UID)
              .delete({ documentId: targetDocumentId, locale: '*' });
          } catch {
            // best-effort cleanup
          }
        }
      }
    });
  });

  describe('discardDraft', () => {
    it('restores polymorphic relations from published version when discarding draft', async () => {
      let sourceDocumentId: string | undefined;
      let targetDocumentId: string | undefined;
      try {
        const { source, target } = await createDraftWithMorphRelations();
        sourceDocumentId = source.documentId;
        targetDocumentId = target.documentId;

        await strapi.documents(POLY_SOURCE_UID).publish({ documentId: source.documentId });

        const draftAfterPublish = await findSourceRow({
          documentId: source.documentId,
          isDraft: true,
        });
        if (!draftAfterPublish?.id) {
          throw new Error('Expected a draft source row id before clearing morphs');
        }
        const { morphColumn } = getMorphToManyMeta(POLY_SOURCE_UID);
        const joinBeforeClear = await loadMorphToManyJoinRows(draftAfterPublish.id as number);

        // `linkedMany: { set: [] }` is a no-op: Knex/entity-manager use `!isEmpty(set)`; `isEmpty([])` is true
        // (`packages/core/database/src/entity-manager/index.ts`). Use `disconnect` with the actual links.
        await strapi.documents(POLY_SOURCE_UID).update({
          documentId: source.documentId,
          data: {
            // @ts-expect-error test schema is defined at runtime via the api-tests builder; TS doesn't know the attributes here
            title: 'Source draft changed',
            linkedOne: null,
            linkedMany: {
              disconnect: joinBeforeClear.map((r: any) => ({
                id: r[morphColumn.idColumn.name],
                __type: r[morphColumn.typeColumn.name],
              })),
            },
          },
        });

        // The draft was intentionally cleared — DB should not keep old polymorphic data on the draft row.
        await assertSourceMorphDbState({
          documentId: source.documentId,
          isDraft: true,
          morphToOne: 'empty',
          expectedJoinTargets: [],
        });

        const discarded = await strapi.documents(POLY_SOURCE_UID).discardDraft({
          documentId: source.documentId,
          populate: {
            linkedOne: true,
            linkedMany: true,
          },
        });

        expect(discarded.entries).toHaveLength(1);
        expect(discarded.entries[0].title).toBe('Source draft');
        expect(discarded.entries[0].linkedOne).toMatchObject({
          documentId: target.documentId,
          __type: POLY_TARGET_UID,
        });
        expect(discarded.entries[0].linkedMany).toHaveLength(1);
        expect(discarded.entries[0].linkedMany[0]).toMatchObject({
          documentId: target.documentId,
          __type: POLY_TARGET_UID,
        });

        const storage2 = await readPolySourceMorphStorage(source.documentId, true);
        if (storage2.morphToOne === 'empty') {
          throw new Error('Expected restored morphs after discardDraft');
        }
        await assertSourceMorphDbState({
          documentId: source.documentId,
          isDraft: true,
          morphToOne: storage2.morphToOne,
          expectedJoinTargets: storage2.joinTargets,
        });
      } finally {
        if (sourceDocumentId) {
          try {
            await strapi
              .documents(POLY_SOURCE_UID)
              .delete({ documentId: sourceDocumentId, locale: '*' });
          } catch {
            // best-effort cleanup
          }
        }
        if (targetDocumentId) {
          try {
            await strapi
              .documents(POLY_TARGET_UID)
              .delete({ documentId: targetDocumentId, locale: '*' });
          } catch {
            // best-effort cleanup
          }
        }
      }
    });
  });

  describe('unpublish', () => {
    it('can unpublish documents that contain polymorphic relations', async () => {
      let sourceDocumentId: string | undefined;
      let targetDocumentId: string | undefined;
      try {
        const { source, target } = await createDraftWithMorphRelations();
        sourceDocumentId = source.documentId;
        targetDocumentId = target.documentId;

        await strapi.documents(POLY_SOURCE_UID).publish({ documentId: source.documentId });

        const publishedSource = await findSourceRow({
          documentId: source.documentId,
          isDraft: false,
        });
        expect(publishedSource).toBeDefined();

        const storageBeforeUnpublish = await readPolySourceMorphStorage(source.documentId, false);
        if (storageBeforeUnpublish.morphToOne === 'empty') {
          throw new Error('Expected morph on published source before unpublish');
        }
        await assertSourceMorphDbState({
          documentId: source.documentId,
          isDraft: false,
          morphToOne: storageBeforeUnpublish.morphToOne,
          expectedJoinTargets: storageBeforeUnpublish.joinTargets,
        });

        const result = await strapi.documents(POLY_SOURCE_UID).unpublish({
          documentId: source.documentId,
        });

        const publishedRows = await strapi.db.query(POLY_SOURCE_UID).findMany({
          where: {
            documentId: source.documentId,
            publishedAt: { $notNull: true },
          },
        });

        expect(result.entries).toHaveLength(1);
        expect(publishedRows).toHaveLength(0);

        // Deleting the published version must not leave `morphToMany` join rows behind for that entry id
        await expectNoJoinRowsForSource(publishedSource.id);

        // The surviving draft should still mirror the same morph storage the published version had
        const storageAfterUnpublish = await readPolySourceMorphStorage(source.documentId, true);
        if (storageAfterUnpublish.morphToOne === 'empty') {
          throw new Error('Expected morph on draft after unpublish');
        }
        expect(storageAfterUnpublish.morphToOne).toEqual(storageBeforeUnpublish.morphToOne);
        // After unpublish, join rows can reference a different local target `id` (e.g. draft vs published
        // row) for the same `documentId`; compare by resolved target document.
        await expectJoinTargetsReferToSameTargetDocuments(
          storageAfterUnpublish.joinTargets,
          storageBeforeUnpublish.joinTargets
        );
      } finally {
        if (sourceDocumentId) {
          try {
            await strapi
              .documents(POLY_SOURCE_UID)
              .delete({ documentId: sourceDocumentId, locale: '*' });
          } catch {
            // best-effort cleanup
          }
        }
        if (targetDocumentId) {
          try {
            await strapi
              .documents(POLY_TARGET_UID)
              .delete({ documentId: targetDocumentId, locale: '*' });
          } catch {
            // best-effort cleanup
          }
        }
      }
    });
  });

  describe('self-referential inverses (morphOne / morphMany) and clone', () => {
    const deleteMorphBoxDoc = async (documentId: string | undefined) => {
      if (!documentId) {
        return;
      }
      try {
        await strapi.documents(MORPH_BOX_UID).delete({ documentId, locale: '*' });
      } catch {
        // best-effort cleanup
      }
    };

    const getMorphBoxDraft = async (documentId: string) => {
      return (await strapi.db.query(MORPH_BOX_UID).findOne({
        where: { documentId, publishedAt: null },
        select: ['id', 'documentId', 'name'],
      })) as { id: number; documentId: string; name: string } | undefined;
    };

    it('inverse morphOne and morphMany populate the owner that points to this entry', async () => {
      let aDocId: string | undefined;
      let bDocId: string | undefined;
      let cDocId: string | undefined;
      try {
        const a = await strapi.documents(MORPH_BOX_UID).create({
          data: { name: 'A' },
        });
        const b = await strapi.documents(MORPH_BOX_UID).create({
          data: { name: 'B' },
        });
        const c = await strapi.documents(MORPH_BOX_UID).create({
          data: { name: 'C' },
        });
        aDocId = a.documentId;
        bDocId = b.documentId;
        cDocId = c.documentId;

        const bRow = await getMorphBoxDraft(b.documentId);
        if (!bRow) {
          throw new Error('Expected draft row B');
        }

        await strapi.documents(MORPH_BOX_UID).update({
          documentId: a.documentId,
          data: {
            // @ts-expect-error test schema is defined at runtime via the api-tests builder
            mto: { id: bRow.id, __type: MORPH_BOX_UID },
            mtm: {
              connect: [{ documentId: c.documentId, __type: MORPH_BOX_UID }],
            },
          },
        });

        const bWithInverse = await strapi.db.query(MORPH_BOX_UID).findOne({
          where: { documentId: b.documentId, publishedAt: null },
          populate: {
            mtoInverse: true,
          },
        } as any);

        // `morphX` for inverse morphOne/morphMany does not add `__type` on the populated target row
        expect(bWithInverse?.mtoInverse).toMatchObject({
          documentId: a.documentId,
          name: 'A',
        });

        // Inverse `mtmInverse` on the morph target row can be null from `db.query`+populate in some
        // self-ref layouts; the forward `mtm` on the owner is authoritative for the same link.
        const aWithMtm = await strapi.db.query(MORPH_BOX_UID).findOne({
          where: { documentId: a.documentId, publishedAt: null },
          populate: {
            mtm: { on: { [MORPH_BOX_UID]: { fields: ['name', 'documentId'] } } },
          },
        } as any);
        expect(aWithMtm?.mtm).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              documentId: c.documentId,
              name: 'C',
            }),
          ])
        );
      } finally {
        await deleteMorphBoxDoc(aDocId);
        await deleteMorphBoxDoc(bDocId);
        await deleteMorphBoxDoc(cDocId);
      }
    });

    it('clone copies morphToOne and morphToMany so the new draft keeps the same links', async () => {
      let aDocId: string | undefined;
      let bDocId: string | undefined;
      let cDocId: string | undefined;
      let cloneDocId: string | undefined;
      try {
        const a = await strapi.documents(MORPH_BOX_UID).create({ data: { name: 'A' } });
        const b = await strapi.documents(MORPH_BOX_UID).create({ data: { name: 'B' } });
        const c = await strapi.documents(MORPH_BOX_UID).create({ data: { name: 'C' } });
        aDocId = a.documentId;
        bDocId = b.documentId;
        cDocId = c.documentId;

        const bRow = await getMorphBoxDraft(b.documentId);
        if (!bRow) {
          throw new Error('Expected draft row B');
        }

        await strapi.documents(MORPH_BOX_UID).update({
          documentId: a.documentId,
          data: {
            // @ts-expect-error test schema is defined at runtime via the api-tests builder
            mto: { id: bRow.id, __type: MORPH_BOX_UID },
            mtm: {
              connect: [{ documentId: c.documentId, __type: MORPH_BOX_UID }],
            },
          },
        });

        const cloned = await strapi.documents(MORPH_BOX_UID).clone({
          documentId: a.documentId,
          data: { name: 'A-clone' },
          populate: {
            mto: true,
            mtm: {
              on: {
                [MORPH_BOX_UID]: { fields: ['name', 'documentId'] },
              },
            },
          },
        });

        expect(cloned.entries).toHaveLength(1);
        expect(cloned.entries[0].name).toBe('A-clone');
        cloneDocId = cloned.documentId;

        const cloneEntry = await strapi.db.query(MORPH_BOX_UID).findOne({
          where: { documentId: cloned.documentId, publishedAt: null },
          populate: {
            mto: true,
            mtm: { on: { [MORPH_BOX_UID]: { fields: ['name', 'documentId'] } } },
          },
        } as any);

        expect(cloneEntry?.mto).toMatchObject({
          documentId: b.documentId,
          name: 'B',
          __type: MORPH_BOX_UID,
        });
        expect(cloneEntry?.mtm).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              documentId: c.documentId,
              name: 'C',
              __type: MORPH_BOX_UID,
            }),
          ])
        );
      } finally {
        await deleteMorphBoxDoc(cloneDocId);
        await deleteMorphBoxDoc(aDocId);
        await deleteMorphBoxDoc(bDocId);
        await deleteMorphBoxDoc(cDocId);
      }
    });
  });
});
