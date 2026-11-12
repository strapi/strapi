'use strict';

const modelsUtils = require('../models');

const stringifyDates = (object) =>
  JSON.parse(
    JSON.stringify(object, (key, value) => {
      if (this[key] instanceof Date) {
        return this[key].toUTCString();
      }
      return value;
    })
  );

const formatFixtures = (value) => value.map((item) => stringifyDates(item));

/**
 * Every action has a `kind`. The builder runs `schema` actions, which write or delete schema
 * files, and `data` actions, which write or delete rows, on different kinds of instances.
 * `build` and `cleanup` receive the options to pass to the model helpers: an instance to reuse,
 * or `registerOnly`.
 */

module.exports = {
  contentType: {
    create(contentType) {
      let createdModel;

      return {
        kind: 'schema',
        async build(ctx, options) {
          createdModel = await modelsUtils.createContentType(contentType, options);
          ctx.addModel(createdModel);
        },
        cleanup: (ctx, options) => modelsUtils.deleteContentType(createdModel.uid, options),
      };
    },

    createBatch(contentTypes) {
      let createdModels = [];

      return {
        kind: 'schema',
        async build(ctx, options) {
          createdModels = await modelsUtils.createContentTypes(contentTypes, options);
          createdModels.forEach(ctx.addModel);
        },
        async cleanup(ctx, options) {
          for (const model of createdModels) {
            await modelsUtils.deleteContentType(model.uid, options);
          }
        },
      };
    },

    createMany(contentTypes) {
      const createdModels = [];

      return {
        kind: 'schema',
        async build(ctx, options) {
          for (const contentType of contentTypes) {
            const model = await modelsUtils.createContentType(contentType, options);

            createdModels.push(model);
            ctx.addModel(model);
          }
        },
        async cleanup(ctx, options) {
          for (const model of createdModels) {
            await modelsUtils.deleteContentType(model.uid, options);
          }
        },
      };
    },
  },
  component: {
    create(component) {
      let createdModel;

      return {
        kind: 'schema',
        async build(ctx, options) {
          createdModel = await modelsUtils.createComponent(component, options);
          ctx.addModel(createdModel);
        },
        cleanup: (ctx, options) => modelsUtils.deleteComponent(createdModel.uid, options),
      };
    },
  },
  fixtures: {
    create(modelName, entries, getFixtures) {
      let createdEntries = [];

      return {
        kind: 'data',
        async build(ctx, options) {
          createdEntries = formatFixtures(
            await modelsUtils.createFixturesFor(
              modelName,
              typeof entries === 'function' ? entries(getFixtures()) : entries,
              options
            )
          );

          ctx.addFixtures(modelName, createdEntries);
        },
        cleanup: (ctx, options) =>
          modelsUtils.deleteFixturesFor(modelName, createdEntries, options),
      };
    },
  },
};
