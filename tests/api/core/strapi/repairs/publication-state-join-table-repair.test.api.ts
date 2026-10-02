import type { Core } from '@strapi/types';
import { cleanComponentJoinTable } from '../../../../../packages/core/core/src/services/document-service/utils/clean-component-join-table';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const TAG_UID = 'api::publication-repair-tag.publication-repair-tag';
const ARTICLE_UID = 'api::publication-repair-article.publication-repair-article';
const PRODUCT_UID = 'api::publication-repair-product.publication-repair-product';
const BOX_UID = 'api::publication-repair-box.publication-repair-box';
const COMPONENT_UID = 'default.publication-repair-component';
const INNER_COMPONENT_UID = 'default.publication-repair-inner-component';

const tagModel = {
  attributes: { name: { type: 'string' } },
  draftAndPublish: true,
  displayName: 'Publication repair tag',
  singularName: 'publication-repair-tag',
  pluralName: 'publication-repair-tags',
};

const articleModel = {
  attributes: {
    name: { type: 'string' },
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
  },
  draftAndPublish: true,
  displayName: 'Publication repair article',
  singularName: 'publication-repair-article',
  pluralName: 'publication-repair-articles',
};

const boxModel = {
  attributes: {
    name: { type: 'string' },
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
  },
  draftAndPublish: false,
  displayName: 'Publication repair box',
  singularName: 'publication-repair-box',
  pluralName: 'publication-repair-boxes',
};

const innerComponentModel = {
  collectionName: 'components_publication_repair_inner_components',
  attributes: {
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
  },
  displayName: 'publication-repair-inner-component',
};

const componentModel = {
  collectionName: 'components_publication_repair_components',
  attributes: {
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
    inner: { type: 'component', component: INNER_COMPONENT_UID },
  },
  displayName: 'publication-repair-component',
};

const productModel = {
  attributes: {
    name: { type: 'string' },
    component: { type: 'component', component: COMPONENT_UID },
  },
  draftAndPublish: true,
  displayName: 'Publication repair product',
  singularName: 'publication-repair-product',
  pluralName: 'publication-repair-products',
};

type RelationInfo = {
  joinTableName: string;
  relation: Parameters<ReturnType<typeof cleanComponentJoinTable>>[2];
  sourceColumn: string;
  sourceModel: Parameters<ReturnType<typeof cleanComponentJoinTable>>[3];
  targetColumn: string;
};

type PublicationVersion = { id: number; publishedAt: string | null };
type RelationRow = Record<string, number | string | null>;

const getRelationInfo = (uid: string, attribute: string): RelationInfo => {
  const sourceModel = strapi.db.metadata.get(uid);
  const relation = sourceModel?.attributes?.[attribute];

  if (!relation?.joinTable) {
    throw new Error(`Could not find the ${uid}.${attribute} join table`);
  }

  return {
    joinTableName: relation.joinTable.name,
    relation,
    sourceColumn: relation.joinTable.joinColumn.name,
    sourceModel,
    targetColumn: relation.joinTable.inverseJoinColumn.name,
  };
};

const createPublishedTag = async (name: string) => {
  const draft = await strapi.documents(TAG_UID).create({ data: { name } });
  await strapi.documents(TAG_UID).publish({ documentId: draft.documentId });

  const versions = (await strapi.db.query(TAG_UID).findMany({
    where: { documentId: draft.documentId },
  })) as unknown as PublicationVersion[];

  return {
    documentId: draft.documentId,
    draft: versions.find((version) => version.publishedAt === null)!,
    published: versions.find((version) => version.publishedAt !== null)!,
  };
};

const duplicateWithOtherTargetState = async (
  info: RelationInfo,
  sourceId: number,
  existingTargetId: number,
  duplicateTargetId: number
) => {
  const original = await strapi.db
    .connection(info.joinTableName)
    .where({ [info.sourceColumn]: sourceId, [info.targetColumn]: existingTargetId })
    .first();

  if (!original) {
    throw new Error('Could not find the relation row to corrupt');
  }

  const duplicate = { ...(original as RelationRow), [info.targetColumn]: duplicateTargetId };
  delete duplicate.id;
  await strapi.db.connection(info.joinTableName).insert(duplicate);
};

const targetIdsFor = async (info: RelationInfo, sourceId: number) => {
  const rows = await strapi.db
    .connection(info.joinTableName)
    .select(info.targetColumn)
    .where(info.sourceColumn, sourceId);

  return (rows as RelationRow[]).map((row) => Number(row[info.targetColumn])).sort((a, b) => a - b);
};

const repair = (info: RelationInfo) =>
  cleanComponentJoinTable(strapi)(strapi.db, info.joinTableName, info.relation, info.sourceModel);

describe('publication-state join-table repair', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([tagModel])
      .addComponent(innerComponentModel)
      .addComponent(componentModel)
      .addContentTypes([articleModel, boxModel, productModel])
      .build();

    strapi = await createStrapiInstance({ logLevel: 'error' });
  });

  afterAll(async () => {
    await strapi?.destroy();
    await builder.cleanup();
  });

  it('keeps the published target for a published content-type source', async () => {
    const tag = await createPublishedTag('direct-published-target');
    const article = await strapi.documents(ARTICLE_UID).create({
      data: { name: 'published direct source', tags: [{ documentId: tag.documentId }] },
    });
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    const info = getRelationInfo(ARTICLE_UID, 'tags');
    const publishedRow = await strapi.db
      .connection(info.joinTableName)
      .where(info.targetColumn, tag.published.id)
      .first();

    await duplicateWithOtherTargetState(
      info,
      publishedRow[info.sourceColumn],
      tag.published.id,
      tag.draft.id
    );

    await repair(info);

    expect(await targetIdsFor(info, publishedRow[info.sourceColumn])).toEqual([tag.published.id]);
  });

  it('keeps the published target for a published component source', async () => {
    const tag = await createPublishedTag('component-published-target');
    const product = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'published component source',
        component: { tags: [{ documentId: tag.documentId }] },
      },
    });
    await strapi.documents(PRODUCT_UID).publish({ documentId: product.documentId });

    const info = getRelationInfo(COMPONENT_UID, 'tags');
    const publishedRow = await strapi.db
      .connection(info.joinTableName)
      .where(info.targetColumn, tag.published.id)
      .first();

    await duplicateWithOtherTargetState(
      info,
      publishedRow[info.sourceColumn],
      tag.published.id,
      tag.draft.id
    );

    await repair(info);

    expect(await targetIdsFor(info, publishedRow[info.sourceColumn])).toEqual([tag.published.id]);
  });

  it('keeps the published target for a nested published component source', async () => {
    const tag = await createPublishedTag('nested-component-published-target');
    const product = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'published nested component source',
        component: { inner: { tags: [{ documentId: tag.documentId }] } },
      },
    });
    await strapi.documents(PRODUCT_UID).publish({ documentId: product.documentId });

    const productVersions = (await strapi.db.query(PRODUCT_UID).findMany({
      where: { documentId: product.documentId },
    })) as unknown as PublicationVersion[];
    const productModel = strapi.db.metadata.get(PRODUCT_UID)!;
    const componentModel = strapi.db.metadata.get(COMPONENT_UID)!;
    const productComponentRows = (await strapi.db
      .connection(`${productModel.tableName}_cmps`)
      .select('*')
      .whereIn(
        'entity_id',
        productVersions.map((version) => version.id)
      )
      .where('component_type', COMPONENT_UID)) as RelationRow[];
    const innerComponentRows = (await strapi.db
      .connection(`${componentModel.tableName}_cmps`)
      .select('*')
      .whereIn(
        'entity_id',
        productComponentRows.map((row) => Number(row.cmp_id))
      )
      .where('component_type', INNER_COMPONENT_UID)) as RelationRow[];

    expect(productComponentRows).toHaveLength(2);
    expect(new Set(innerComponentRows.map((row) => Number(row.cmp_id))).size).toBe(2);

    const info = getRelationInfo(INNER_COMPONENT_UID, 'tags');
    const publishedRow = await strapi.db
      .connection(info.joinTableName)
      .where(info.targetColumn, tag.published.id)
      .first();

    await duplicateWithOtherTargetState(
      info,
      publishedRow[info.sourceColumn],
      tag.published.id,
      tag.draft.id
    );

    await repair(info);

    expect(await targetIdsFor(info, publishedRow[info.sourceColumn])).toEqual([tag.published.id]);
  });

  it('keeps the draft target for a draft source', async () => {
    const tag = await createPublishedTag('draft-source-target');
    const article = await strapi.documents(ARTICLE_UID).create({
      data: { name: 'draft direct source', tags: [{ documentId: tag.documentId }] },
    });

    const info = getRelationInfo(ARTICLE_UID, 'tags');
    const draftRow = await strapi.db
      .connection(info.joinTableName)
      .where(info.targetColumn, tag.draft.id)
      .first();

    await duplicateWithOtherTargetState(
      info,
      draftRow[info.sourceColumn],
      tag.draft.id,
      tag.published.id
    );

    await repair(info);

    expect(await targetIdsFor(info, draftRow[info.sourceColumn])).toEqual([tag.draft.id]);
  });

  it('leaves duplicate targets for a source without Draft & Publish', async () => {
    const tag = await createPublishedTag('non-dp-source-target');
    const box = await strapi.documents(BOX_UID).create({
      data: { name: 'non-DP source', tags: [{ documentId: tag.documentId }] },
    });

    const info = getRelationInfo(BOX_UID, 'tags');
    const sourceRow = await strapi.db.connection(info.joinTableName).first();

    const targetsBeforeRepair = await targetIdsFor(info, sourceRow[info.sourceColumn]);

    await repair(info);

    expect(await targetIdsFor(info, sourceRow[info.sourceColumn])).toEqual(targetsBeforeRepair);
    await strapi.documents(BOX_UID).delete({ documentId: box.documentId });
  });

  it('leaves a single target relation untouched', async () => {
    const tag = await createPublishedTag('single-target');
    const article = await strapi.documents(ARTICLE_UID).create({
      data: { name: 'single relation source', tags: [{ documentId: tag.documentId }] },
    });

    const info = getRelationInfo(ARTICLE_UID, 'tags');
    const draftRow = await strapi.db
      .connection(info.joinTableName)
      .where(info.targetColumn, tag.draft.id)
      .first();

    await repair(info);

    expect(await targetIdsFor(info, draftRow[info.sourceColumn])).toEqual([tag.draft.id]);
  });

  it('runs the production repair during the next bootstrap and records its completion', async () => {
    const tag = await createPublishedTag('bootstrap-published-target');
    const article = await strapi.documents(ARTICLE_UID).create({
      data: { name: 'bootstrap published source', tags: [{ documentId: tag.documentId }] },
    });
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    const info = getRelationInfo(ARTICLE_UID, 'tags');
    const publishedRow = await strapi.db
      .connection(info.joinTableName)
      .where(info.targetColumn, tag.published.id)
      .first();

    await duplicateWithOtherTargetState(
      info,
      Number((publishedRow as RelationRow)[info.sourceColumn]),
      tag.published.id,
      tag.draft.id
    );

    await strapi.store.delete({ type: 'strapi', key: 'unidirectional-join-table-repair-ran' });
    await strapi.destroy();
    strapi = await createStrapiInstance({ logLevel: 'error' });

    const restartedInfo = getRelationInfo(ARTICLE_UID, 'tags');
    expect(
      await targetIdsFor(
        restartedInfo,
        Number((publishedRow as RelationRow)[restartedInfo.sourceColumn])
      )
    ).toEqual([tag.published.id]);
    await expect(
      strapi.store.get({ type: 'strapi', key: 'unidirectional-join-table-repair-ran' })
    ).resolves.toBe(true);
  });
});
