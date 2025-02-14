'use strict';

const { createAuthRequest } = require('api-tests/request');
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const pluralize = require('pluralize');

let strapi;
let rq;
const warnSpy = jest.fn();

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();

  rq = await createAuthRequest({ strapi });
};

const compoSchema = {
  category: 'default',
  displayName: 'temporarycomponent',
  attributes: {
    title: { type: 'string', required: false },
  },
};

const componentUID = `${compoSchema.category}.${compoSchema.displayName}`;

const compoKeepSchema = {
  category: 'default',
  displayName: 'keepcomponent',
  attributes: {
    title: { type: 'string', required: false },
  },
};

const componentKeepUID = `${compoKeepSchema.category}.${compoKeepSchema.displayName}`;

const contentType = {
  displayName: 'contentwithcomponent',
  singularName: 'contentwithcomponent',
  pluralName: 'contentwithcomponents',
  // draftAndPublish: true,
  attributes: {
    tempcomp: {
      type: 'component',
      component: componentUID,
      required: false,
      repeatable: true,
    },
    keepcomp: {
      type: 'component',
      component: componentKeepUID,
      required: false,
      repeatable: true,
    },
  },
};

const testCollectionTypeUID = `api::${contentType.singularName}.${contentType.singularName}`;

describe('Component Deletion and Cleanup Test', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Create the permanent component
    await rq({
      method: 'POST',
      url: '/content-type-builder/components',
      body: {
        component: compoKeepSchema,
      },
    });
    await restart();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create and delete component, then verify cleanup', async () => {
    // Create a component
    const compoResult = await rq({
      method: 'POST',
      url: '/content-type-builder/components',
      body: {
        component: compoSchema,
      },
    });

    expect(compoResult.statusCode).toBe(201);
    expect(compoResult.body).toEqual({
      data: {
        uid: componentUID,
      },
    });

    await restart();

    // Create content type with the component
    const ctResult = await rq({
      method: 'POST',
      url: '/content-type-builder/content-types',
      body: {
        contentType,
      },
    });

    expect(ctResult.statusCode).toBe(201);
    expect(ctResult.body).toEqual({
      data: {
        uid: testCollectionTypeUID,
      },
    });

    await restart();

    // Create an entry with the component
    const entryData = {
      tempcomp: [{ title: 'Sample One' }, { title: 'Sample Two' }],
      keepcomp: [{ title: 'Sample Three' }, { title: 'Sample Four' }],
    };

    const entryRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${testCollectionTypeUID}`,
      body: entryData,
    });

    expect(entryRes.statusCode).toBe(201);

    // Query the content type's components table to check for the entry's component data
    const dbResultBeforeDeletion = await strapi.db.connection
      .select('*')
      .from(`${contentType.pluralName}_cmps`);

    // Verify data for the components exists in the database
    expect(dbResultBeforeDeletion.filter((row) => row.component_type === componentUID).length).toBe(
      2
    );
    expect(
      dbResultBeforeDeletion.filter((row) => row.component_type === componentKeepUID).length
    ).toBe(2);

    // Delete the component
    const deleteComponentRes = await rq({
      method: 'DELETE',
      url: `/content-type-builder/components/${componentUID}`,
    });

    expect(deleteComponentRes.statusCode).toBe(200);
    expect(deleteComponentRes.body).toEqual({
      data: { uid: componentUID },
    });

    await restart();

    // Verify the component is no longer accessible
    const fetchDeletedComponentRes = await rq({
      method: 'GET',
      url: `/content-type-builder/components/${componentUID}`,
    });

    expect(fetchDeletedComponentRes.statusCode).toBe(404);
    expect(fetchDeletedComponentRes.body).toEqual({
      error: 'component.notFound',
    });

    // Ensure data related to the deleted component is no longer in the database
    const dbResult = await strapi.db.connection.raw(`SELECT * FROM ${contentType.pluralName}_cmps`);

    // Ensure table for the deleted component no longer exists
    const tempComponentTableExists = await strapi.db.connection.schema.hasTable(
      `components_${compoSchema.category}_${pluralize(compoSchema.displayName)}`
    );
    expect(tempComponentTableExists).toBe(false);

    // Ensure table for the retained component still exists
    const keepComponentTableExists = await strapi.db.connection.schema.hasTable(
      `components_${compoKeepSchema.category}_${pluralize(compoKeepSchema.displayName)}`
    );
    expect(keepComponentTableExists).toBe(true);

    // Verify our content type has no references to the deleted component
    const hasDeletedComponentData = dbResult.some((row) => row.component_type === componentUID);
    expect(hasDeletedComponentData).toBe(false);

    // Recreate the component
    const recreatedComponentResult = await rq({
      method: 'POST',
      url: '/content-type-builder/components',
      body: {
        component: compoSchema,
      },
    });

    expect(recreatedComponentResult.statusCode).toBe(201);
    expect(recreatedComponentResult.body).toEqual({
      data: {
        uid: componentUID,
      },
    });

    await restart();

    // Update content type to add it back to confirm it works (no remnants blocking it)
    const updatedContentTypeResult = await rq({
      method: 'PUT',
      url: `/content-type-builder/content-types/${testCollectionTypeUID}`,
      body: {
        contentType,
      },
    });

    expect(updatedContentTypeResult.statusCode).toBe(201);
    expect(updatedContentTypeResult.body).toEqual({
      data: {
        uid: testCollectionTypeUID,
      },
    });
  });
});
