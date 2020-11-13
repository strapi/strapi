'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { isFunction } = require('lodash/fp');
const { createStrapiInstance } = require('./strapi');

const createHelpers = async options => {
  const strapi = await createStrapiInstance(options);
  const contentTypeService = strapi.plugins['content-type-builder'].services.contenttypes;
  const componentsService = strapi.plugins['content-type-builder'].services.components;

  return {
    strapi,
    contentTypeService,
    componentsService,
  };
};

const createContentType = async model => {
  const { contentTypeService, strapi } = await createHelpers();

  const contentType = await contentTypeService.createContentType({
    contentType: {
      connection: 'default',
      ...model,
    },
  });

  await strapi.destroy();

  return contentType;
};

const createContentTypes = async models => {
  const { contentTypeService, strapi } = await createHelpers();

  const contentTypes = await contentTypeService.createContentTypes(
    models.map(model => ({
      contentType: {
        connection: 'default',
        ...model,
      },
    }))
  );

  await strapi.destroy();

  return contentTypes;
};

const createComponent = async component => {
  const { componentsService, strapi } = await createHelpers();

  const createdComponent = await componentsService.createComponent({
    component: {
      category: 'default',
      icon: 'default',
      connection: 'default',
      ...component,
    },
  });

  await strapi.destroy();

  return createdComponent;
};

const createComponents = async components => {
  const createdComponents = [];

  for (const component of components) {
    createdComponents.push(await createComponent(component));
  }

  return createdComponents;
};

const deleteComponent = async componentUID => {
  const { componentsService, strapi } = await createHelpers();

  const component = await componentsService.deleteComponent(componentUID);

  await strapi.destroy();

  return component;
};

const deleteComponents = async componentsUID => {
  const deletedComponents = [];

  for (const componentUID of componentsUID) {
    deletedComponents.push(await deleteComponent(componentUID));
  }

  return deletedComponents;
};

const deleteContentType = async modelName => {
  const { contentTypeService, strapi } = await createHelpers();
  const uid = `application::${modelName}.${modelName}`;

  const contentType = await contentTypeService.deleteContentType(uid);

  await strapi.destroy();

  return contentType;
};

const deleteContentTypes = async modelsName => {
  const { contentTypeService, strapi } = await createHelpers();
  const toUID = name => `application::${name}.${name}`;

  const contentTypes = await contentTypeService.deleteContentTypes(modelsName.map(toUID));

  await strapi.destroy();

  return contentTypes;
};

async function cleanupModels(models) {
  for (const model of models) {
    await cleanupModel(model);
  }
}

async function cleanupModel(model) {
  const { strapi } = await createHelpers();

  await strapi.query(model).delete();
  await strapi.destroy();
}

async function createFixtures(dataMap) {
  const { strapi } = await createHelpers();
  const models = Object.keys(dataMap);
  const resultMap = {};

  for (const model of models) {
    const entries = [];

    for (const data of dataMap[model]) {
      entries.push(await strapi.query(model).create(data));
    }

    resultMap[model] = entries;
  }

  await strapi.destroy();

  return resultMap;
}

async function createFixturesFor(model, entries) {
  const { strapi } = await createHelpers();
  const results = [];

  for (const entry of entries) {
    const dataToCreate = isFunction(entry) ? entry(results) : entry;
    results.push(await strapi.query(model).create(dataToCreate));
  }

  await strapi.destroy();

  return results;
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
};
