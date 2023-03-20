'use strict';

const { get } = require('lodash/fp');

const modelsUtils = require('../models');
const { sanitize } = require('../../../packages/core/utils');
const actionRegistry = require('./action-registry');
const { createContext } = require('./context');

const createTestBuilder = (options = {}) => {
  const { initialState } = options;
  const ctx = createContext(initialState);

  return {
    get models() {
      return ctx.state.models;
    },

    get fixtures() {
      return ctx.state.fixtures;
    },

    async sanitizedFixtures(strapi) {
      const { fixtures } = this;

      for (const key of Object.keys(fixtures)) {
        fixtures[key] = await this.sanitizedFixturesFor(key, strapi);
      }

      return fixtures;
    },

    sanitizedFixturesFor(modelName, strapi) {
      const model = strapi.getModel(modelsUtils.toContentTypeUID(modelName));
      const fixtures = this.fixturesFor(modelName);

      return sanitize.contentAPI.output(fixtures, model);
    },

    fixturesFor(modelName) {
      return this.fixtures[modelName];
    },

    addAction(code, ...params) {
      const actionCreator = get(code, actionRegistry);

      ctx.addAction(actionCreator(...params));

      return this;
    },

    addContentType(contentType) {
      return this.addAction('contentType.create', contentType);
    },

    addContentTypes(contentTypes, { batch = true } = {}) {
      return this.addAction(
        batch ? 'contentType.createBatch' : 'contentType.createMany',
        contentTypes
      );
    },

    addComponent(component) {
      return this.addAction('component.create', component);
    },

    addFixtures(model, entries) {
      return this.addAction('fixtures.create', model, entries, () => this.fixtures);
    },

    async build() {
      for (const action of ctx.state.actions) {
        await action.build(ctx);
      }

      return this;
    },

    async cleanup(options = {}) {
      const { enableTestDataAutoCleanup = true } = options;
      const { models, actions } = ctx.state;

      if (enableTestDataAutoCleanup) {
        for (const model of models.reverse()) {
          await modelsUtils.cleanupModel(model.uid);
        }
      }

      for (const action of actions.reverse()) {
        await action.cleanup(ctx);
      }

      ctx.resetState();

      return this;
    },
  };
};

module.exports = { createTestBuilder };
