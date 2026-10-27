'use strict';

const { createStrapiInstance } = require('./strapi');
const componentData = require('../../core/core/src/services/document-service/components');

const toContentTypeUID = (name) => {
  return name.includes('::') ? name : `api::${name}.${name}`;
};

const toCompoUID = (name) => {
  return `default.${name}`;
};

/**
 * Boots an instance for a helper. Helper instances only write schema files or rows and never
 * serve GraphQL requests, so they skip building the GraphQL schema. The instance a test boots
 * itself still builds it.
 */
const createHelperInstance = (options = {}) =>
  createStrapiInstance({ buildGraphqlSchema: false, ...options });

/**
 * Gives a helper an instance and its content-type-builder services.
 *
 * @param {object} [options]
 * @param {object} [options.strapi] An instance to reuse. The helper then neither boots nor
 *   destroys one.
 * @param {boolean} [options.registerOnly] Only load the registries. Enough for the helpers that
 *   write or delete schema files; the next full boot syncs the database with them.
 */
const createHelpers = async ({ strapi: strapiInstance = null, registerOnly = false } = {}) => {
  const strapi = strapiInstance || (await createHelperInstance({ registerOnly }));
  const contentTypeService = strapi.plugin('content-type-builder').service('content-types');
  const componentsService = strapi.plugin('content-type-builder').service('components');

  const cleanup = async () => {
    if (strapiInstance == null) {
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

const createContentType = async (model, { strapi, registerOnly } = {}) => {
  const { contentTypeService, cleanup } = await createHelpers({ strapi, registerOnly });

  const contentType = await contentTypeService.createContentType({
    contentType: {
      ...model,
    },
  });

  await cleanup();

  return contentType;
};

const createContentTypes = async (models, { strapi, registerOnly } = {}) => {
  const { contentTypeService, cleanup } = await createHelpers({ strapi, registerOnly });

  const contentTypes = await contentTypeService.createContentTypes(
    models.map((model) => ({
      contentType: {
        ...model,
      },
    }))
  );

  await cleanup();

  return contentTypes;
};

const createComponent = async (component, { strapi, registerOnly } = {}) => {
  const { componentsService, cleanup } = await createHelpers({ strapi, registerOnly });

  const createdComponent = await componentsService.createComponent({
    component: {
      category: 'default',
      icon: 'default',
      ...component,
    },
  });

  await cleanup();

  return createdComponent;
};

const createComponents = async (components, { strapi, registerOnly } = {}) => {
  const createdComponents = [];

  for (const component of components) {
    createdComponents.push(await createComponent(component, { strapi, registerOnly }));
  }

  return createdComponents;
};

const deleteComponent = async (componentUID, { strapi, registerOnly } = {}) => {
  const { componentsService, cleanup } = await createHelpers({ strapi, registerOnly });

  const component = await componentsService.deleteComponent(componentUID);

  await cleanup();

  return component;
};

const deleteComponents = async (componentsUID, { strapi, registerOnly } = {}) => {
  const deletedComponents = [];

  for (const componentUID of componentsUID) {
    deletedComponents.push(await deleteComponent(componentUID, { strapi, registerOnly }));
  }

  return deletedComponents;
};

const deleteContentType = async (uid, { strapi, registerOnly } = {}) => {
  const { contentTypeService, cleanup } = await createHelpers({ strapi, registerOnly });

  const contentType = await contentTypeService.deleteContentType(uid);

  await cleanup();

  return contentType;
};

const deleteContentTypes = async (modelsUIDs, { strapi, registerOnly } = {}) => {
  const { contentTypeService, cleanup } = await createHelpers({ strapi, registerOnly });

  const contentTypes = await contentTypeService.deleteContentTypes(modelsUIDs);

  await cleanup();

  return contentTypes;
};

async function cleanupModel(uid, { strapi: strapiIst } = {}) {
  const { strapi, cleanup } = await createHelpers({ strapi: strapiIst });

  await strapi.db.query(uid).deleteMany();

  await cleanup();
}

async function cleanupModels(models, { strapi } = {}) {
  for (const model of models) {
    await cleanupModel(model, { strapi });
  }
}

async function createFixtures(dataMap, { strapi: strapiIst } = {}) {
  const { strapi, cleanup } = await createHelpers({ strapi: strapiIst });
  const models = Object.keys(dataMap);
  const resultMap = {};

  for (const model of models) {
    const entries = [];

    for (const data of dataMap[model]) {
      entries.push(await strapi.db.query(toContentTypeUID(model)).create({ data }));
    }

    resultMap[model] = entries;
  }

  await cleanup();

  return resultMap;
}

async function createFixturesFor(model, entries, { strapi: strapiIst } = {}) {
  const { strapi, cleanup } = await createHelpers({ strapi: strapiIst });

  const uid = toContentTypeUID(model);
  const contentType = strapi.getModel(uid);

  const results = [];

  for (const entry of entries) {
    const dataToCreate = typeof entry === 'function' ? entry(results) : entry;

    const componentValidData = await componentData.createComponents(uid, dataToCreate);
    const entryData = Object.assign(
      componentData.omitComponentData(contentType, dataToCreate),
      componentValidData
    );

    const res = await strapi.db.query(uid).create({ data: entryData });

    results.push(res);
  }

  await cleanup();

  return results;
}

async function deleteFixturesFor(model, entries, { strapi: strapiIst } = {}) {
  const { strapi, cleanup } = await createHelpers({ strapi: strapiIst });

  await strapi.db
    .query(toContentTypeUID(model))
    .deleteMany({ where: { id: entries.map((entry) => entry?.id) } });

  await cleanup();
}

async function modifyContentType(data, { strapi } = {}) {
  const { contentTypeService, cleanup } = await createHelpers({ strapi });

  const sanitizedData = { ...data };
  delete sanitizedData.editable;
  delete sanitizedData.restrictRelationsTo;

  const uid = toContentTypeUID(sanitizedData.singularName);

  const ct = await contentTypeService.editContentType(uid, {
    contentType: {
      ...sanitizedData,
    },
  });

  await cleanup();

  return ct;
}

async function modifyComponent(data, { strapi } = {}) {
  const { componentsService, cleanup } = await createHelpers({ strapi });

  const sanitizedData = { ...data };
  delete sanitizedData.editable;
  delete sanitizedData.restrictRelationsTo;

  const uid = toCompoUID(sanitizedData.displayName);

  const compo = await componentsService.editComponent(uid, {
    component: {
      ...sanitizedData,
    },
  });

  await cleanup();

  return compo;
}

async function getContentTypeSchema(modelName, { strapi: strapiIst } = {}) {
  const { strapi, contentTypeService, cleanup } = await createHelpers({ strapi: strapiIst });

  const uid = toContentTypeUID(modelName);
  const ct = contentTypeService.formatContentType(strapi.contentTypes[uid]);

  await cleanup();

  return (ct || {}).schema;
}

module.exports = {
  toContentTypeUID,
  createHelperInstance,
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
  // Update
  modifyContentType,
  modifyComponent,
  // Misc
  getContentTypeSchema,
};

const profile = require('./profile');

if (profile.enabled) {
  const modeOf = (args) => {
    const options = args.find((arg) => arg && typeof arg === 'object' && !Array.isArray(arg)) ?? {};
    if (options.strapi) return 'shared';
    return options.registerOnly ? 'register-only' : 'boots';
  };

  for (const [name, fn] of Object.entries(module.exports)) {
    if (typeof fn === 'function' && name !== 'toContentTypeUID') {
      module.exports[name] = (...args) =>
        profile.timed(`models.${name}`, () => fn(...args), { mode: modeOf(args) });
    }
  }
}
