'use strict';

const { isFunction, isNil, prop } = require('lodash/fp');
const { createStrapiInstance } = require('./strapi');

const createHelpers = async ({ strapi: strapiInstance = null, ...options } = {}) => {
  const strapi = strapiInstance || (await createStrapiInstance(options));
  const contentTypeService = strapi.plugins['content-type-builder'].services.contenttypes;
  const componentsService = strapi.plugins['content-type-builder'].services.components;

  const cleanup = async () => {
    if (isNil(strapiInstance)) {
      await strapi.destroy();
    }
  };

  return {
    strapi,
    contentTypeService,
    componentsService,
    cleanup,
  };
};

const createContentType = async (model, { strapi } = {}) => {
  const { contentTypeService, cleanup } = await createHelpers({ strapi });

  const contentType = await contentTypeService.createContentType({
    contentType: {
      connection: 'default',
      ...model,
    },
  });

  await cleanup();

  return contentType;
};

const createContentTypes = async (models, { strapi } = {}) => {
  const { contentTypeService, cleanup } = await createHelpers({ strapi });

  const contentTypes = await contentTypeService.createContentTypes(
    models.map(model => ({
      contentType: {
        connection: 'default',
        ...model,
      },
    }))
  );

  await cleanup();

  return contentTypes;
};

const createComponent = async (component, { strapi } = {}) => {
  const { componentsService, cleanup } = await createHelpers({ strapi });

  const createdComponent = await componentsService.createComponent({
    component: {
      category: 'default',
      icon: 'default',
      connection: 'default',
      ...component,
    },
  });

  await cleanup();

  return createdComponent;
};

const createComponents = async (components, { strapi } = {}) => {
  const createdComponents = [];

  for (const component of components) {
    createdComponents.push(await createComponent(component, { strapi }));
  }

  return createdComponents;
};

const deleteComponent = async (componentUID, { strapi } = {}) => {
  const { componentsService, cleanup } = await createHelpers({ strapi });

  const component = await componentsService.deleteComponent(componentUID);

  await cleanup();

  return component;
};

const deleteComponents = async (componentsUID, { strapi } = {}) => {
  const deletedComponents = [];

  for (const componentUID of componentsUID) {
    deletedComponents.push(await deleteComponent(componentUID, { strapi }));
  }

  return deletedComponents;
};

const deleteContentType = async (modelName, { strapi } = {}) => {
  const { contentTypeService, cleanup } = await createHelpers({ strapi });
  const uid = `application::${modelName}.${modelName}`;

  const contentType = await contentTypeService.deleteContentType(uid);

  await cleanup();

  return contentType;
};

const deleteContentTypes = async (modelsName, { strapi } = {}) => {
  const { contentTypeService, cleanup } = await createHelpers({ strapi });
  const toUID = name => `application::${name}.${name}`;

  const contentTypes = await contentTypeService.deleteContentTypes(modelsName.map(toUID));

  await cleanup();

  return contentTypes;
};

async function cleanupModels(models, { strapi } = {}) {
  for (const model of models) {
    await cleanupModel(model, { strapi });
  }
}

async function cleanupModel(model, { strapi: strapiIst } = {}) {
  const { strapi, cleanup } = await createHelpers({ strapi: strapiIst });

  await strapi.query(model).delete();

  await cleanup();
}

async function createFixtures(dataMap, { strapi: strapiIst } = {}) {
  const { strapi, cleanup } = await createHelpers({ strapi: strapiIst });
  const models = Object.keys(dataMap);
  const resultMap = {};

  for (const model of models) {
    const entries = [];

    for (const data of dataMap[model]) {
      entries.push(await strapi.query(model).create(data));
    }

    resultMap[model] = entries;
  }

  await cleanup();

  return resultMap;
}

async function createFixturesFor(model, entries, { strapi: strapiIst } = {}) {
  const { strapi, cleanup } = await createHelpers({ strapi: strapiIst });
  const results = [];

  for (const entry of entries) {
    const dataToCreate = isFunction(entry) ? entry(results) : entry;
    results.push(await strapi.query(model).create(dataToCreate));
  }

  await cleanup();

  return results;
}

async function deleteFixturesFor(model, entries, { strapi: strapiIst } = {}) {
  const { strapi, cleanup } = await createHelpers({ strapi: strapiIst });

  await strapi.query(model).delete({ id_in: entries.map(prop('id')) });

  await cleanup();
}

async function modifyContentType(data, { strapi } = {}) {
  const { contentTypeService, cleanup } = await createHelpers({ strapi });

  const sanitizedData = { ...data };
  delete sanitizedData.editable;
  delete sanitizedData.restrictRelationsTo;

  const uid = `application::${sanitizedData.name}.${sanitizedData.name}`;

  const ct = await contentTypeService.editContentType(uid, {
    contentType: {
      connection: 'default',
      ...sanitizedData,
    },
  });

  await cleanup();

  return ct;
}

async function getContentTypeSchema(modelName, { strapi: strapiIst } = {}) {
  const { strapi, contentTypeService, cleanup } = await createHelpers({ strapi: strapiIst });

  const uid = `application::${modelName}.${modelName}`;
  const ct = contentTypeService.formatContentType(strapi.contentTypes[uid]);

  await cleanup();

  return (ct || {}).schema;
}

module.exports = {
  // Create Content-Types
  createContentType,
  createContentTypes,
  // Delete Content-Types
  deleteContentType,
  deleteContentTypes,
  // Cleanup Models
  cleanupModel,
  cleanupModels,
  // Create Components
  createComponent,
  createComponents,
  // Delete Components
  deleteComponent,
  deleteComponents,
  // Fixtures
  createFixtures,
  createFixturesFor,
  deleteFixturesFor,
  // Update Content-Types
  modifyContentType,
  // Misc
  getContentTypeSchema,
};
