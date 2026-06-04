import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

interface CategoryRelation {
  count: number;
}

interface CategoryEntry {
  documentId: string;
  name: string;
  parent?: CategoryRelation | null;
  children?: CategoryRelation[];
  related?: CategoryRelation[];
}

const builder = createTestBuilder();
let strapi: any;
let rq: any;

const data: { categories: CategoryEntry[] } = {
  categories: [],
};

const category = {
  displayName: 'category',
  singularName: 'category',
  pluralName: 'categories',
  kind: 'collectionType',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
    },
    // Bidirectional self-referential: parent ↔ children
    parent: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::category.category',
      targetAttribute: 'children',
    },
    // Unidirectional self-referential
    related: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::category.category',
    },
  },
} as const;

const getCategory = async (
  documentId: string,
  status: 'draft' | 'published' = 'draft'
): Promise<CategoryEntry> => {
  const res = await rq({
    method: 'GET',
    url: `/content-manager/collection-types/api::category.category/${documentId}`,
    qs: { status },
  });
  return res.body.data as CategoryEntry;
};

describe('CM API - Self-referential relations with Draft & Publish', () => {
  beforeAll(async () => {
    await builder.addContentType(category).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Create two categories
    for (const name of ['Category A', 'Category B']) {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category',
        body: { name },
      });
      data.categories.push(res.body.data as CategoryEntry);
    }
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Self-referential relation (entry to itself) is preserved after publish', async () => {
    const [catA] = data.categories;

    // Set catA's parent to itself (self-referential)
    await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::category.category/${catA.documentId}`,
      body: {
        name: catA.name,
        parent: { documentId: catA.documentId, locale: null },
      },
    });

    // Verify draft has the self-relation
    const draftBefore = await getCategory(catA.documentId, 'draft');
    expect(draftBefore.parent).toMatchObject({ count: 1 });

    // Publish
    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${catA.documentId}/actions/publish`,
    });

    // Verify published version has the self-relation
    const published = await getCategory(catA.documentId, 'published');
    expect(published.parent).toMatchObject({ count: 1 });
  });

  test('Self-referential relation between two entries is preserved after publish', async () => {
    const [catA, catB] = data.categories;

    // Set catB's parent to catA
    await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::category.category/${catB.documentId}`,
      body: {
        name: catB.name,
        parent: { documentId: catA.documentId, locale: null },
      },
    });

    // Publish catB
    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${catB.documentId}/actions/publish`,
    });

    // Verify published catB has the relation to catA
    const published = await getCategory(catB.documentId, 'published');
    expect(published.parent).toMatchObject({ count: 1 });
  });

  test('Self-referential relation (entry to itself) is preserved after discard draft', async () => {
    const [catA] = data.categories;

    // Update the draft while keeping the self-relation
    await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::category.category/${catA.documentId}`,
      body: {
        name: 'Category A - modified',
        parent: { documentId: catA.documentId, locale: null },
      },
    });

    // Discard draft (reverts to published version)
    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${catA.documentId}/actions/discard`,
    });

    // Verify the reverted draft still has the self-relation
    const draft = await getCategory(catA.documentId, 'draft');
    expect(draft.parent).toMatchObject({ count: 1 });
  });

  test('regression: relation in published parent is preserved when only the child is independently republished', async () => {
    // This directly reproduces the GitHub bug report:
    // 1. "Home" is published with two children.
    // 2. One child ("Category B") is independently edited and republished.
    // 3. The child must still appear in Home's PUBLISHED relation list.
    //    Before the fix, it was silently deleted.
    const [catA, catB] = data.categories;

    // Set catA (Home) to reference catB (Test 3122) via the unidirectional "related" field
    await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::category.category/${catA.documentId}`,
      body: { name: 'Home', related: [{ documentId: catB.documentId, locale: null }] },
    });

    // Publish catA (Home) — now the published version has catB in its "related" list
    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${catA.documentId}/actions/publish`,
    });

    // Publish catB (the child) — previously this deleted the relation in Home's published version
    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${catB.documentId}/actions/publish`,
    });

    // catB must still appear in catA's PUBLISHED relation list
    const publishedHome = await getCategory(catA.documentId, 'published');
    expect(publishedHome.related).toMatchObject({ count: 1 });

    // The preserved relation must point at catB specifically — not just be "some" relation.
    // This guards against the row being re-pointed to a wrong/stale target during the
    // delete-and-recreate publish cycle.
    const relatedRes = await rq({
      method: 'GET',
      url: `/content-manager/relations/api::category.category/${catA.documentId}/related`,
      qs: { status: 'published' },
    });
    expect(relatedRes.statusCode).toBe(200);
    expect(relatedRes.body.results).toHaveLength(1);
    expect(relatedRes.body.results[0]).toMatchObject({ documentId: catB.documentId });

    // DB-level guard for the cascade-delete assumption behind the fix.
    // The fix relies on the old published target's join row being cascade-deleted
    // before sync() re-inserts the re-pointed row. The CM relation endpoint above
    // joins to live target rows, so it would silently hide an orphan row left
    // pointing at the deleted old published target. Assert directly on the join
    // table that (a) no orphan rows survive and (b) there is exactly one
    // published-side link Home(pub) -> catB(pub). If the publish pipeline ever
    // stops cascade-deleting the stale row, this fails even though the count above
    // would still pass.
    const connection = strapi.db.getConnection();
    const categoryMeta = strapi.db.metadata.get('api::category.category');
    const {
      name: joinTableName,
      joinColumn,
      inverseJoinColumn,
    } = categoryMeta.attributes.related.joinTable;

    const liveCategoryIds = new Set(
      (await connection.select('id').from(categoryMeta.tableName)).map((row: any) => row.id)
    );

    const joinRows = await connection.select('*').from(joinTableName);

    // (a) No orphans: both sides of every row reference a live category row.
    for (const row of joinRows) {
      expect(liveCategoryIds.has(row[joinColumn.name])).toBe(true);
      expect(liveCategoryIds.has(row[inverseJoinColumn.name])).toBe(true);
    }

    // (b) Exactly one published-side link, pointing Home(pub) -> catB(pub).
    const [publishedA] = await strapi.db.query('api::category.category').findMany({
      where: { documentId: catA.documentId, publishedAt: { $notNull: true } },
      select: ['id'],
    });
    const [publishedB] = await strapi.db.query('api::category.category').findMany({
      where: { documentId: catB.documentId, publishedAt: { $notNull: true } },
      select: ['id'],
    });

    const publishedLinks = joinRows.filter((row: any) => row[joinColumn.name] === publishedA.id);
    expect(publishedLinks).toHaveLength(1);
    expect(publishedLinks[0][inverseJoinColumn.name]).toBe(publishedB.id);
  });
});
