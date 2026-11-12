/**
 * Regression: a dynamic-zone component inside a D&P-enabled content-type loses its
 * relation to a D&P-enabled target when the parent is published before the target.
 *
 * Bug shape (from a user report):
 *  1. Create a draft parent that has a DZ with one component, the component holds a
 *     relation to a draft target.
 *  2. Publish the parent while the target is still draft-only.
 *  3. Publish the target.
 *  4. The published parent's component reports an empty relation in the API/GraphQL.
 *
 * Re-publishing the parent worked around it because that path re-runs `transformData`
 * and finds the now-existing published target.
 */
import type { Core } from '@strapi/types';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

const PARENT_UID = 'api::page.page';
const CATEGORY_UID = 'api::dpcat.dpcat';
const COMPONENT_UID = 'default.featured-cat';

const componentModel = {
  collectionName: 'components_default_featured_cats',
  displayName: 'featured-cat',
  attributes: {
    title: { type: 'string' },
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: CATEGORY_UID,
    },
  },
};

const categoryModel = {
  attributes: { name: { type: 'string' } },
  draftAndPublish: true,
  displayName: 'DpCat',
  singularName: 'dpcat',
  pluralName: 'dpcats',
  description: '',
  collectionName: '',
};

const parentModel = {
  attributes: {
    title: { type: 'string' },
    modules: {
      type: 'dynamiczone',
      components: [COMPONENT_UID],
    },
  },
  draftAndPublish: true,
  displayName: 'Page',
  singularName: 'page',
  pluralName: 'pages',
  description: '',
  collectionName: '',
};

let strapi: Core.Strapi;
const builder = createTestBuilder();

describe('DZ component → D&P target inside D&P parent', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([categoryModel])
      .addComponent(componentModel)
      .addContentTypes([parentModel])
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('Publishing target after parent links the published DZ component', async () => {
    const draftCat = await strapi.documents(CATEGORY_UID).create({
      data: { name: 'A draft category' },
    });

    const draftParent = await strapi.documents(PARENT_UID).create({
      data: {
        title: 'Relation in modules test',
        modules: [
          {
            __component: COMPONENT_UID,
            title: 'Featured!',
            categories: [{ documentId: draftCat.documentId }],
          },
        ],
      },
    });

    // Parent is published while the category is still draft-only:
    // transformData drops the missing-published relation, so the published
    // component is created with no row in the relation join table.
    await strapi.documents(PARENT_UID).publish({ documentId: draftParent.documentId });

    // Publishing the category should retroactively link the already-published
    // component to the new published category.
    await strapi.documents(CATEGORY_UID).publish({ documentId: draftCat.documentId });

    const publishedCat = await strapi.db.query(CATEGORY_UID).findOne({
      where: { documentId: draftCat.documentId, publishedAt: { $ne: null } },
    });
    expect(publishedCat).toBeTruthy();

    const publishedParent = await strapi.documents(PARENT_UID).findOne({
      documentId: draftParent.documentId,
      populate: { modules: { on: { [COMPONENT_UID]: { populate: { categories: true } } } } },
      status: 'published',
    });

    expect(publishedParent).toBeDefined();
    const modules = (publishedParent as any).modules;
    expect(modules).toHaveLength(1);
    expect(modules[0].categories).toHaveLength(1);
    expect(modules[0].categories[0].id).toBe(publishedCat.id);
  });
});
