import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

interface CategoryRelation {
  documentId: string;
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
    expect(draftBefore.parent).toMatchObject({ documentId: catA.documentId });

    // Publish
    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${catA.documentId}/actions/publish`,
    });

    // Verify published version has the self-relation
    const published = await getCategory(catA.documentId, 'published');
    expect(published.parent).toMatchObject({ documentId: catA.documentId });
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
    expect(published.parent).toMatchObject({ documentId: catA.documentId });
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
    expect(draft.parent).toMatchObject({ documentId: catA.documentId });
  });
});
