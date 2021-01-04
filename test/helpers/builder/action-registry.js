'use strict';

const { concat, merge, isFunction, map } = require('lodash/fp');
const modelsUtils = require('../models');

const stringifyDates = object =>
  JSON.parse(
    JSON.stringify(object, (key, value) => {
      if (this[key] instanceof Date) {
        return this[key].toUTCString();
      }
      return value;
    })
  );

const formatFixtures = map(stringifyDates);

module.exports = {
  ct: {
    create: contentType => {
      let createdModel;

      return {
        async build(state) {
          createdModel = await modelsUtils.createContentType(contentType);
          return { ...state, models: [...state.models, createdModel] };
        },
        cleanup: () => modelsUtils.deleteContentType(createdModel.modelName),
      };
    },

    createBatch: contentTypes => {
      let createdModels = [];

      return {
        async build(state) {
          createdModels = await modelsUtils.createContentTypes(contentTypes);
          return { ...state, models: concat(state.models, createdModels) };
        },
        async cleanup() {
          for (const model of createdModels) {
            await modelsUtils.deleteContentType(model.modelName);
          }
        },
      };
    },

    createMany: contentTypes => {
      const createdModels = [];

      return {
        async build(state) {
          for (const contentType of contentTypes) {
            createdModels.push(await modelsUtils.createContentType(contentType));
          }

          return { ...state, models: concat(state.models, createdModels) };
        },
        async cleanup() {
          for (const model of createdModels) {
            await modelsUtils.deleteContentType(model.modelName);
          }
        },
      };
    },
  },
  comp: {
    create: component => {
      let createdModel;

      return {
        async build(state) {
          createdModel = await modelsUtils.createComponent(component);
          return { ...state, models: [...state.models, createdModel] };
        },
        cleanup: () => modelsUtils.deleteComponent(createdModel.uid),
      };
    },
  },
  fixtures: {
    create(modelName, entries, getFixtures) {
      let createdEntries = [];

      return {
        async build(state) {
          createdEntries = formatFixtures(
            await modelsUtils.createFixturesFor(
              modelName,
              isFunction(entries) ? entries(getFixtures()) : entries
            )
          );
          return { ...state, fixtures: merge(state.fixtures, { [modelName]: createdEntries }) };
        },
        cleanup: () => modelsUtils.deleteFixturesFor(modelName, createdEntries),
      };
    },
  },
};
