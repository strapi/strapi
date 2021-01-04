'use strict';

const { omit, get } = require('lodash/fp');
const _ = require('lodash');
const modelsUtils = require('../models');
const { sanitizeEntity } = require('../../../packages/strapi-utils');
const actionRegistry = require('./action-registry');

const createTestBuilder = (options = {}) => {
  const { initialState } = options;
  const omitActions = omit('actions');
  const getDefaultState = () => ({ actions: [], models: [], fixtures: {}, ...initialState });

  const state = getDefaultState();

  const addAction = (code, ...params) => {
    const action = get(code, actionRegistry);
    state.actions.push(action(...params));
  };

  return {
    get models() {
      return state.models;
    },

    get fixtures() {
      return state.fixtures;
    },

    sanitizedFixtures(strapi) {
      return _.mapValues(this.fixtures, (value, key) => this.sanitizedFixturesFor(key, strapi));
    },

    sanitizedFixturesFor(modelName, strapi) {
      const model = strapi.getModel(modelName);
      const fixtures = this.fixturesFor(modelName);

      return sanitizeEntity(fixtures, { model });
    },

    fixturesFor(modelName) {
      return this.fixtures[modelName];
    },

    addContentType(contentType) {
      addAction('ct.create', contentType);
      return this;
    },

    addContentTypes(contentTypes, { batch = true } = {}) {
      addAction(batch ? 'ct.createBatch' : 'ct.createMany', contentTypes);
      return this;
    },

    addComponent(component) {
      addAction('comp.create', component);
      return this;
    },

    addFixtures(model, entries) {
      addAction('fixtures.create', model, entries, () => this.fixtures);
      return this;
    },

    async build() {
      for (const action of state.actions) {
        const newState = await action.build(omitActions(state));
        Object.assign(state, newState);
      }
    },

    async cleanup(options = {}) {
      const { enableTestDataAutoCleanup = true } = options;

      if (enableTestDataAutoCleanup) {
        for (const model of state.models.reverse()) {
          await modelsUtils.cleanupModel(model.uid || model.modelName);
        }
      }

      for (const action of state.actions.reverse()) {
        await action.cleanup();
      }
    },
  };
};

module.exports = { createTestBuilder };
