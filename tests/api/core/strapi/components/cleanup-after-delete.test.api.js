'use strict';

const { createAuthRequest } = require('api-tests/request');
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

let strapi;
let rq;

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
    // await builder.addComponent(component).addContentType(contentType).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // create the permanent component
    await rq({
      method: 'POST',
      url: '/content-type-builder/components',
      body: {
        component: compoKeepSchema,
      },
    });
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

    // Expect that data for the components exists in the database
    // Expect exactly two entries for each component type
    expect(
      dbResultBeforeDeletion.filter((row) => row.component_type === 'default.temporarycomponent')
        .length
    ).toBe(2);
    expect(
      dbResultBeforeDeletion.filter((row) => row.component_type === 'default.keepcomponent').length
    ).toBe(2);

    // Delete the component
    const deleteComponentRes = await rq({
      method: 'DELETE',
      url: `/content-type-builder/components/${componentUID}`,
    });

    expect(deleteComponentRes.statusCode).toBe(200);
    expect(deleteComponentRes.body).toEqual({
      data: { uid: 'default.temporarycomponent' },
    });

    // Restart Strapi
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
    console.error('dbResult', JSON.stringify(dbResult, null, 2));

    // Ensure table for the deleted component no longer exists
    const tempComponentTableExists = await strapi.db.connection.schema.hasTable(
      'components_default_tempcomponents'
    );
    expect(tempComponentTableExists).toBe(false); // Table for deleted component should not exist

    // Ensure table for the retained component still exists
    const keepComponentTableExists = await strapi.db.connection.schema.hasTable(
      'components_default_keepcomponents'
    );
    expect(keepComponentTableExists).toBe(true); // Table for retained component should still exist

    // Expect that dbResult array does not contain an object with component_type of the deleted component
    const hasDeletedComponentData = dbResult.some(
      (row) => row.component_type === 'default.temporarycomponent'
    );
    expect(hasDeletedComponentData).toBe(false); // Should not contain data related to deleted component

    // Recreate the component
    const compoResult2 = await rq({
      method: 'POST',
      url: '/content-type-builder/components',
      body: {
        component: compoSchema,
      },
    });

    expect(compoResult2.statusCode).toBe(201);
    expect(compoResult2.body).toEqual({
      data: {
        uid: componentUID,
      },
    });

    await restart();

    // update ct to add it back to confirm it works (no remnants blocking it)
    const ctResult2 = await rq({
      method: 'POST',
      url: '/content-type-builder/content-types',
      body: {
        contentType,
      },
    });

    expect(ctResult2.statusCode).toBe(201);
    expect(ctResult2.body).toEqual({
      data: {
        uid: testCollectionTypeUID,
      },
    });
  });
});
