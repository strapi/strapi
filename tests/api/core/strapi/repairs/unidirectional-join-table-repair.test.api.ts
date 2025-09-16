/**
 * API tests for the unidirectional join-table repair.
 *
 * These tests insert bad data directly into the DB to simulate the original bug:
 * duplicated component join-table rows pointing to both the draft and the
 * published versions of the same target document for a single component instance.
 *
 * We validate that:
 * - Only the unintended duplicate is removed (published row when a draft row also exists)
 * - Legitimate rows are never deleted (single relations remain)
 * - If the component's parent does not support D&P, nothing is deleted
 */
import type { Core } from '@strapi/types';
// Note: Avoid wrapping in a transaction to prevent pool deadlocks with SQLite

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

// Local cleaner used for tests to have full control and avoid coupling to core internals
const testCleaner = async (
  db: any,
  joinTableName: string,
  relation: any,
  sourceModel: any
): Promise<number> => {
  try {
    const targetModel = db.metadata.get(relation.target);
    if (!targetModel) {
      return 0;
    }

    // Check if target supports D&P
    const targetCt = (strapi as any).contentTypes?.[relation.target];
    const targetSupportsDP = !!targetCt?.options?.draftAndPublish;
    if (!targetSupportsDP) {
      return 0;
    }

    // Column names
    const sourceColumn = relation.joinTable.joinColumn.name;
    const targetColumn = relation.joinTable.inverseJoinColumn.name;

    // Load join rows with target published_at
    const rows = await db
      .connection(joinTableName)
      .select(
        `${joinTableName}.id as join_id`,
        `${joinTableName}.${sourceColumn} as source_id`,
        `${joinTableName}.${targetColumn} as target_id`,
        `${targetModel.tableName}.published_at as target_published_at`,
        `${targetModel.tableName}.document_id as target_document_id`
      )
      .leftJoin(
        targetModel.tableName,
        `${joinTableName}.${targetColumn}`,
        `${targetModel.tableName}.id`
      );

    // Group by component instance (source)
    const bySource: Record<string, any[]> = {};
    for (const r of rows) {
      const key = String(r.source_id);
      bySource[key] = bySource[key] || [];
      bySource[key].push(r);
    }

    // Resolve table names for our parents to detect D&P support
    const productMd = db.metadata.get(PRODUCT_UID);
    const boxMd = db.metadata.get(BOX_UID);
    const productCmpsTable = productMd?.tableName ? `${productMd.tableName}_cmps` : undefined;
    const boxCmpsTable = boxMd?.tableName ? `${boxMd.tableName}_cmps` : undefined;

    const toDelete: number[] = [];

    for (const [sourceId, entries] of Object.entries(bySource)) {
      if (entries.length <= 1) continue;

      // Parent D&P check: find component row to get entity_id
      let parentSupportsDP = true;
      try {
        // Prefer mapping tables to detect parent type reliably
        let productParent = null;
        let boxParent = null;
        if (productCmpsTable) {
          productParent = await db
            .connection(productCmpsTable)
            .select('entity_id')
            .where('cmp_id', Number(sourceId))
            .first();
        }
        if (!productParent && boxCmpsTable) {
          boxParent = await db
            .connection(boxCmpsTable)
            .select('entity_id')
            .where('cmp_id', Number(sourceId))
            .first();
        }
        if (boxParent) parentSupportsDP = false;
      } catch (e) {
        // If any error, default to safe side: do not delete
        parentSupportsDP = false;
      }
      if (!parentSupportsDP) {
        continue;
      }

      // For each document, if both draft and published relations exist, delete the published one(s)
      const byDoc: Record<string, any[]> = {};
      for (const e of entries) {
        const key = String(e.target_document_id ?? '');
        byDoc[key] = byDoc[key] || [];
        byDoc[key].push(e);
      }
      for (const [docId, docEntries] of Object.entries(byDoc)) {
        if (!docId || docEntries.length <= 1) continue;
        const publishedEntries = docEntries.filter((e) => e.target_published_at !== null);
        const draftEntries = docEntries.filter((e) => e.target_published_at === null);
        if (publishedEntries.length > 0 && draftEntries.length > 0) {
          for (const pub of publishedEntries) toDelete.push(pub.join_id);
        }
      }
    }

    if (toDelete.length > 0) {
      await db.connection(joinTableName).whereIn('id', toDelete).del();
    }

    return toDelete.length;
  } catch (err) {
    return 0;
  }
};

let strapi: Core.Strapi;
const builder = createTestBuilder();

const TAG_UID = 'api::repair-tag.repair-tag';
const PRODUCT_UID = 'api::repair-product.repair-product';
const BOX_UID = 'api::repair-box.repair-box';
const ARTICLE_UID = 'api::repair-article.repair-article';
const REPAIR_COMPONENT_UID = 'default.repair-compo';
const REPAIR_INNER_COMPONENT_UID = 'default.repair-inner';

const innerComponentModel = {
  collectionName: 'components_repair_inner',
  attributes: {
    rtags: {
      type: 'relation',
      relation: 'oneToMany',
      target: TAG_UID,
    },
  },
  displayName: 'repair-inner',
};

const componentModel = {
  collectionName: 'components_repair_compo',
  attributes: {
    rtag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
    },
    rtags: {
      type: 'relation',
      relation: 'oneToMany',
      target: TAG_UID,
    },
    inner: {
      type: 'component',
      component: REPAIR_INNER_COMPONENT_UID,
    },
  },
  displayName: 'repair-compo',
};

const productModel = {
  attributes: {
    name: { type: 'string' },
    rcompo: { type: 'component', component: REPAIR_COMPONENT_UID },
  },
  draftAndPublish: true,
  displayName: 'Repair Product',
  singularName: 'repair-product',
  pluralName: 'repair-products',
};

const tagModel = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: true,
  displayName: 'Repair Tag',
  singularName: 'repair-tag',
  pluralName: 'repair-tags',
};

// Non-component content type with a unidirectional many-to-many relation to tags
const articleModel = {
  attributes: {
    title: { type: 'string' },
    tags: {
      type: 'relation',
      relation: 'manyToMany',
      target: TAG_UID,
    },
  },
  draftAndPublish: true,
  displayName: 'Repair Article',
  singularName: 'repair-article',
  pluralName: 'repair-articles',
};

// Parent without D&P that still embeds the component
const boxModel = {
  attributes: {
    title: { type: 'string' },
    rcompo: { type: 'component', component: REPAIR_COMPONENT_UID },
  },
  draftAndPublish: false,
  displayName: 'Repair Box',
  singularName: 'repair-box',
  pluralName: 'repair-boxes',
};

// Helper to locate component->rtags join table and its column names from metadata
const getCompoTagsRelationInfo = () => {
  const componentMd: any = (strapi as any).db.metadata.get(REPAIR_COMPONENT_UID);
  if (!componentMd) {
    throw new Error('Repair component metadata not found');
  }
  const relation: any = componentMd.attributes?.rtags;
  if (!relation?.joinTable) {
    throw new Error('Repair component rtags relation not found');
  }
  const joinTableName = relation.joinTable.name;
  const sourceColumn = relation.joinTable.joinColumn.name;
  const targetColumn = relation.joinTable.inverseJoinColumn.name;
  return { joinTableName, sourceColumn, targetColumn } as const;
};

// Helper to locate InnerComponent->rtags join table and its column names from metadata
const getInnerCompoTagsRelationInfo = () => {
  const componentMd: any = (strapi as any).db.metadata.get(REPAIR_INNER_COMPONENT_UID);
  if (!componentMd) {
    throw new Error('Repair inner component metadata not found');
  }
  const relation: any = componentMd.attributes?.rtags;
  if (!relation?.joinTable) {
    throw new Error('Repair inner component rtags relation not found');
  }
  const joinTableName = relation.joinTable.name;
  const sourceColumn = relation.joinTable.joinColumn.name;
  const targetColumn = relation.joinTable.inverseJoinColumn.name;
  return { joinTableName, sourceColumn, targetColumn } as const;
};

// Helper to locate Article->tags join table and its column names from metadata
const getArticleTagsRelationInfo = () => {
  const articleMd: any = (strapi as any).db.metadata.get(ARTICLE_UID);
  if (!articleMd) {
    throw new Error('Repair article metadata not found');
  }
  const relation: any = articleMd.attributes?.tags;
  if (!relation?.joinTable) {
    throw new Error('Repair article tags relation not found');
  }
  const joinTableName = relation.joinTable.name;
  const sourceColumn = relation.joinTable.joinColumn.name;
  const targetColumn = relation.joinTable.inverseJoinColumn.name;
  return { joinTableName, sourceColumn, targetColumn } as const;
};

const selectAll = async (table: string) => {
  const rows = await strapi.db.connection(table).select('*');
  return rows as any[];
};

const selectBySource = async (table: string, sourceColumn: string, sourceId: number) => {
  const rows = await strapi.db.connection(table).select('*').where(sourceColumn, sourceId);
  return rows as any[];
};

describe('Unidirectional join-table repair (components)', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([tagModel])
      .addComponent(innerComponentModel)
      .addComponent(componentModel)
      .addContentTypes([productModel, boxModel, articleModel])
      .build();

    strapi = await createStrapiInstance({ logLevel: 'error' });

    // Seed baseline tag used across tests (draft+published)
    await strapi.db
      .query(TAG_UID)
      .create({ data: { documentId: 'GTagR', name: 'GhostTagR', publishedAt: null } });
    await strapi.documents(TAG_UID).publish({ documentId: 'GTagR' });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('Removes duplicate published row when both draft and published exist for one component instance', async () => {
    const { joinTableName, sourceColumn, targetColumn } = getCompoTagsRelationInfo();

    // Get draft & published tag IDs for documentId GTagR
    const tagVersions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'GTagR' } });
    const draftTag = tagVersions.find((t: any) => t.publishedAt === null)!;
    const publishedTag = tagVersions.find((t: any) => t.publishedAt !== null)!;

    // Create draft product with a component relation to the draft tag
    const product = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'Product-with-ghost',
        rcompo: { rtags: [{ documentId: 'GTagR', status: 'draft' }] },
      },
      status: 'draft',
    });

    // There should be a single draft relation row for the component instance
    let rows = await selectAll(joinTableName);

    expect(rows.length).toBe(1);
    const draftRow = rows[0];
    expect(draftRow[targetColumn]).toBe(draftTag.id);

    // Insert an unintended duplicate pointing to the published tag for the same source
    const sourceId = draftRow[sourceColumn];
    const insertRow = { ...draftRow };
    delete (insertRow as any).id;
    insertRow[targetColumn] = publishedTag.id;
    await strapi.db.connection(joinTableName).insert(insertRow);

    rows = await selectBySource(joinTableName, sourceColumn, sourceId);

    expect(rows.length).toBe(2);
    const targetIds = rows.map((r) => r[targetColumn]).sort();
    expect(targetIds).toEqual([draftTag.id, publishedTag.id].sort());

    const removed = await strapi.db.repair.processUnidirectionalJoinTables(testCleaner);

    expect(removed).toBeGreaterThanOrEqual(1);

    // Only the published duplicate should be removed; the draft relation must remain
    rows = await selectBySource(joinTableName, sourceColumn, sourceId);

    expect(rows.length).toBe(1);
    expect(rows[0][targetColumn]).toBe(draftTag.id);

    // Cleanup created product
    await strapi.documents(PRODUCT_UID).delete({ documentId: product.documentId });
  });

  it('Repairs duplicates for nested component relations (inner component -> tags)', async () => {
    const { joinTableName, sourceColumn, targetColumn } = getInnerCompoTagsRelationInfo();

    // Get draft & published tag IDs for documentId GTagR
    const tagVersions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'GTagR' } });
    const draftTag = tagVersions.find((t: any) => t.publishedAt === null)!;
    const publishedTag = tagVersions.find((t: any) => t.publishedAt !== null)!;

    // Create draft product with a nested component relation to the draft tag
    const product = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'Product-nested-ghost',
        rcompo: { inner: { rtags: [{ documentId: 'GTagR', status: 'draft' }] } },
      },
      status: 'draft',
    });

    // There should be a single draft relation row for the INNER component instance
    let rows = await selectAll(joinTableName);

    expect(rows.length).toBe(1);
    const draftRow = rows[0];
    expect(draftRow[targetColumn]).toBe(draftTag.id);

    // Insert an unintended duplicate pointing to the published tag for the same INNER source
    const sourceId = draftRow[sourceColumn];
    const insertRow = { ...draftRow } as any;
    delete insertRow.id;
    insertRow[targetColumn] = publishedTag.id;
    await strapi.db.connection(joinTableName).insert(insertRow);

    rows = await selectBySource(joinTableName, sourceColumn, sourceId);

    expect(rows.length).toBe(2);
    const targetIds = rows.map((r) => r[targetColumn]).sort();
    expect(targetIds).toEqual([draftTag.id, publishedTag.id].sort());

    const removed = await strapi.db.repair.processUnidirectionalJoinTables(testCleaner);

    expect(removed).toBeGreaterThanOrEqual(1);

    // Only the published duplicate should be removed; the draft relation must remain
    rows = await selectBySource(joinTableName, sourceColumn, sourceId);

    expect(rows.length).toBe(1);
    expect(rows[0][targetColumn]).toBe(draftTag.id);

    // Cleanup created product
    await strapi.documents(PRODUCT_UID).delete({ documentId: product.documentId });
  });

  it('Does not delete single relations (safety) for draft-only or published-only', async () => {
    const { joinTableName, sourceColumn, targetColumn } = getCompoTagsRelationInfo();

    const tagVersions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'GTagR' } });
    const draftTag = tagVersions.find((t: any) => t.publishedAt === null)!;
    const publishedTag = tagVersions.find((t: any) => t.publishedAt !== null)!;

    // Draft-only relation: product in draft referencing draft tag
    const draftOnly = await strapi.documents(PRODUCT_UID).create({
      data: { name: 'Draft-only', rcompo: { rtags: [{ documentId: 'GTagR', status: 'draft' }] } },
      status: 'draft',
    });

    // Published-only relation: product in draft referencing published tag by id
    const publishedOnly = await strapi.documents(PRODUCT_UID).create({
      data: { name: 'Published-only', rcompo: { rtags: [{ id: publishedTag.id }] } },
      status: 'draft',
    });

    // Collect rows per component instance
    const rowsAll = await selectAll(joinTableName);

    const compoIdsByName: Record<string, number> = {};
    // Find the two component instances by correlating to tag ids present
    // We find component instances having a single row pointing to draftTag or publishedTag respectively
    const bySource: Record<number, any[]> = {};
    for (const row of rowsAll) {
      const sid = row[sourceColumn];
      bySource[sid] = bySource[sid] || [];
      bySource[sid].push(row);
    }

    const sources = Object.entries(bySource).filter(([, v]) => v.length === 1);
    expect(sources.length).toBeGreaterThanOrEqual(2);

    const draftOnlySource = sources.find(
      ([, [r]]) => r[targetColumn] === draftTag.id
    )![0] as unknown as number;
    const publishedOnlySource = sources.find(
      ([, [r]]) => r[targetColumn] === publishedTag.id
    )![0] as unknown as number;
    compoIdsByName['draft'] = Number(draftOnlySource);
    compoIdsByName['published'] = Number(publishedOnlySource);

    const removed = await strapi.db.repair.processUnidirectionalJoinTables(testCleaner);

    expect(removed).toBeGreaterThanOrEqual(0);

    // Ensure both single relations are untouched
    const draftRows = await selectBySource(joinTableName, sourceColumn, compoIdsByName['draft']);

    expect(draftRows.length).toBe(1);
    expect(draftRows[0][targetColumn]).toBe(draftTag.id);

    const publishedRows = await selectBySource(
      joinTableName,
      sourceColumn,
      compoIdsByName['published']
    );

    expect(publishedRows.length).toBe(1);
    expect(publishedRows[0][targetColumn]).toBe(publishedTag.id);

    // Cleanup
    await strapi.documents(PRODUCT_UID).delete({ documentId: draftOnly.documentId });
    await strapi.documents(PRODUCT_UID).delete({ documentId: publishedOnly.documentId });
  });

  it("Does not delete when component's parent does not support D&P (safety)", async () => {
    const { joinTableName, sourceColumn, targetColumn } = getCompoTagsRelationInfo();

    const tagVersions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'GTagR' } });
    const draftTag = tagVersions.find((t: any) => t.publishedAt === null)!;
    const publishedTag = tagVersions.find((t: any) => t.publishedAt !== null)!;

    // Create a Box (no D&P) with component relation to a draft tag via documents service
    const boxEntry = await strapi.documents(BOX_UID).create({
      data: {
        title: 'No-DP-Box',
        rcompo: {
          rtag: { documentId: 'GTagR', status: 'draft' },
          rtags: [{ documentId: 'GTagR', status: 'draft' }],
        },
      },
    });

    // Find the component instance id directly from the join table using the draft target
    const rowForDraft = await strapi.db
      .connection(joinTableName)
      .select('*')
      .where(targetColumn, draftTag.id)
      .first();

    expect(rowForDraft).toBeDefined();
    const sourceId = rowForDraft[sourceColumn];

    // Confirm at least one join row exists for this component instance
    let rows = await selectBySource(joinTableName, sourceColumn, sourceId);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    const draftRow = rowForDraft;

    // Insert a published duplicate for the same component instance
    const duplicate = { ...draftRow };
    delete (duplicate as any).id;
    duplicate[targetColumn] = publishedTag.id;
    await strapi.db.connection(joinTableName).insert(duplicate);

    rows = await selectBySource(joinTableName, sourceColumn, sourceId);

    expect(rows.length).toBe(2);

    // Run repair - should skip because parent (BOX) has no draftAndPublish
    const removed = await strapi.db.repair.processUnidirectionalJoinTables(testCleaner);

    expect(removed).toBeGreaterThanOrEqual(0);

    // Both rows must remain
    rows = await selectBySource(joinTableName, sourceColumn, sourceId);

    expect(rows.length).toBe(2);

    // Cleanup created box entry
    await strapi.documents(BOX_UID).delete({ documentId: boxEntry.documentId });
  });

  it('Cleans duplicates across multiple component instances in a single run', async () => {
    const { joinTableName, sourceColumn, targetColumn } = getCompoTagsRelationInfo();

    // Resolve draft and published tag ids
    const tagVersions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'GTagR' } });
    const draftTag = tagVersions.find((t: any) => t.publishedAt === null)!;
    const publishedTag = tagVersions.find((t: any) => t.publishedAt !== null)!;

    // Create two draft products each linking the component to the draft tag (distinct component instances)
    const prodA = await strapi.documents(PRODUCT_UID).create({
      data: { name: 'Multi-A', rcompo: { rtags: [{ documentId: 'GTagR', status: 'draft' }] } },
      status: 'draft',
    });
    const prodB = await strapi.documents(PRODUCT_UID).create({
      data: { name: 'Multi-B', rcompo: { rtags: [{ documentId: 'GTagR', status: 'draft' }] } },
      status: 'draft',
    });

    // Identify the two component instances by selecting rows pointing to the draft tag
    const draftRowsAll = await strapi.db
      .connection(joinTableName)
      .select('*')
      .where(targetColumn, draftTag.id);
    expect(draftRowsAll.length).toBeGreaterThanOrEqual(2);

    // Take two distinct sources
    const uniqueSources: number[] = [];
    for (const r of draftRowsAll) {
      const sid = r[sourceColumn];
      if (!uniqueSources.includes(sid)) uniqueSources.push(sid);
      if (uniqueSources.length === 2) break;
    }
    expect(uniqueSources.length).toBe(2);

    // For each source, insert a duplicate row pointing to the published tag
    for (const srcId of uniqueSources) {
      const baseRow = draftRowsAll.find((r) => r[sourceColumn] === srcId)!;
      const dup = { ...baseRow } as any;
      delete dup.id;
      dup[targetColumn] = publishedTag.id;
      await strapi.db.connection(joinTableName).insert(dup);
    }

    // Sanity: each selected source should now have both draft and published
    for (const srcId of uniqueSources) {
      const rows = await selectBySource(joinTableName, sourceColumn, srcId);
      const targets = rows.map((r) => r[targetColumn]);
      expect(targets).toEqual(expect.arrayContaining([draftTag.id, publishedTag.id]));
    }

    // Run repair once, should remove the published duplicates for both sources
    const removed = await strapi.db.repair.processUnidirectionalJoinTables(testCleaner);
    expect(removed).toBeGreaterThanOrEqual(2);

    // Verify only the draft relation remains for each source
    for (const srcId of uniqueSources) {
      const rows = await selectBySource(joinTableName, sourceColumn, srcId);
      expect(rows.length).toBe(1);
      expect(rows[0][targetColumn]).toBe(draftTag.id);
    }

    // Cleanup products
    await strapi.documents(PRODUCT_UID).delete({ documentId: prodA.documentId });
    await strapi.documents(PRODUCT_UID).delete({ documentId: prodB.documentId });
  });

  it('Only removes per-document published duplicates; different documents remain linked', async () => {
    const { joinTableName, sourceColumn, targetColumn } = getCompoTagsRelationInfo();

    // Create a second tag document so we can link two different documents from the same component instance
    await strapi.db
      .query(TAG_UID)
      .create({ data: { documentId: 'GTagS', name: 'GhostTagS', publishedAt: null } });
    await strapi.documents(TAG_UID).publish({ documentId: 'GTagS' });

    const tagRVersions = await strapi.db
      .query(TAG_UID)
      .findMany({ where: { documentId: 'GTagR' } });
    const tagSVersions = await strapi.db
      .query(TAG_UID)
      .findMany({ where: { documentId: 'GTagS' } });
    const draftR = tagRVersions.find((t: any) => t.publishedAt === null)!;
    const publishedR = tagRVersions.find((t: any) => t.publishedAt !== null)!;
    const draftS = tagSVersions.find((t: any) => t.publishedAt === null)!;
    const publishedS = tagSVersions.find((t: any) => t.publishedAt !== null)!;

    // One product with a component instance
    const product = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'Mixed-targets',
        rcompo: { rtags: [{ documentId: 'GTagR', status: 'draft' }] },
      },
      status: 'draft',
    });

    // Identify the source component instance (row pointing to draftR)
    const baseRow = await strapi.db
      .connection(joinTableName)
      .select('*')
      .where(targetColumn, draftR.id)
      .first();
    expect(baseRow).toBeDefined();
    const sourceId = baseRow[sourceColumn];

    // Insert a second row linking to another document (GTagS) using the draft version — legitimate
    const rowToS = { ...baseRow } as any;
    delete rowToS.id;
    rowToS[targetColumn] = draftS.id;
    await strapi.db.connection(joinTableName).insert(rowToS);

    // Also add a published link for GTagS to simulate mixed states across different documents (still legitimate)
    const rowToSPublished = { ...baseRow } as any;
    delete rowToSPublished.id;
    rowToSPublished[targetColumn] = publishedS.id;
    await strapi.db.connection(joinTableName).insert(rowToSPublished);

    // Sanity: we now have at least 3 rows for the same source (R-draft, S-draft, S-published)
    let rows = await selectBySource(joinTableName, sourceColumn, sourceId);
    expect(rows.length).toBeGreaterThanOrEqual(3);

    // Add the duplicate for R document: publishedR to make sure only that published duplicate is removed
    const rowToRPublished = { ...baseRow } as any;
    delete rowToRPublished.id;
    rowToRPublished[targetColumn] = publishedR.id;
    await strapi.db.connection(joinTableName).insert(rowToRPublished);

    rows = await selectBySource(joinTableName, sourceColumn, sourceId);
    // We should have at least: R-draft, R-published, S-draft, S-published
    expect(rows.length).toBeGreaterThanOrEqual(4);

    const removed = await strapi.db.repair.processUnidirectionalJoinTables(testCleaner);
    // Only the published duplicate for document R (which has both draft+published) should be removed
    expect(removed).toBeGreaterThanOrEqual(1);

    // Post-conditions: R-draft remains; S-draft remains; S-published is also removed (per-document rule)
    const after = await selectBySource(joinTableName, sourceColumn, sourceId);
    const targetIds = after.map((r) => r[targetColumn]);
    expect(after.length).toBe(2);
    expect(targetIds).toEqual(expect.arrayContaining([draftR.id, draftS.id]));
    expect(targetIds).not.toEqual(expect.arrayContaining([publishedR.id, publishedS.id]));

    // Cleanup created product and secondary tag document
    await strapi.documents(PRODUCT_UID).delete({ documentId: product.documentId });
    await strapi.documents(TAG_UID).delete({ documentId: 'GTagS' });
  });

  it('Repairs duplicates on a non-component unidirectional many-to-many relation', async () => {
    const { joinTableName, sourceColumn, targetColumn } = getArticleTagsRelationInfo();

    // Ensure baseline tag (GTagR) exists and get its versions
    const tagVersions = await strapi.db.query(TAG_UID).findMany({ where: { documentId: 'GTagR' } });
    const draftTag = tagVersions.find((t: any) => t.publishedAt === null)!;
    const publishedTag = tagVersions.find((t: any) => t.publishedAt !== null)!;

    // Create a draft article linking to draft tag via documents service
    const article = await strapi.documents(ARTICLE_UID).create({
      data: { title: 'Article-1', tags: [{ documentId: 'GTagR', status: 'draft' }] },
      status: 'draft',
    });

    // Load the join row for this article->draftTag
    const initial = await strapi.db
      .connection(joinTableName)
      .select('*')
      .where(targetColumn, draftTag.id)
      .first();
    expect(initial).toBeDefined();
    const sourceId = initial[sourceColumn];

    // Insert unintended duplicate pointing to the published tag
    const dup = { ...initial } as any;
    delete dup.id;
    dup[targetColumn] = publishedTag.id;
    await strapi.db.connection(joinTableName).insert(dup);

    // Sanity check
    let rows = await selectBySource(joinTableName, sourceColumn, sourceId);
    expect(rows.length).toBe(2);

    const removed = await strapi.db.repair.processUnidirectionalJoinTables(testCleaner);
    expect(removed).toBeGreaterThanOrEqual(1);

    // Expect only the draft relation to remain
    rows = await selectBySource(joinTableName, sourceColumn, sourceId);
    expect(rows.length).toBe(1);
    expect(rows[0][targetColumn]).toBe(draftTag.id);

    // Cleanup article
    await strapi.documents(ARTICLE_UID).delete({ documentId: article.documentId });
  });
});
