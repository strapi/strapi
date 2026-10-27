'use strict';

const { get } = require('lodash');

const modelsUtils = require('../models');
const actionRegistry = require('./action-registry');
const { createContext } = require('./context');
const profile = require('../profile');

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

      return strapi.contentAPI.sanitize.output(fixtures, model);
    },

    fixturesFor(modelName) {
      return this.fixtures[modelName];
    },

    addAction(code, ...params) {
      const actionCreator = get(actionRegistry, code);

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

    /**
     * Each step used to boot and destroy a whole app. Now:
     *
     * - The first schema step still boots the app. That boot syncs the database with the schema
     *   files earlier test files left, so a table they deleted is dropped before a schema of the
     *   same name is written again.
     * - Later schema steps only load the registries and write files. The next boot syncs them.
     * - Consecutive fixture steps share one booted instance. The schema does not change between
     *   them.
     */
    async build() {
      await profile.timed('builder.build', async () => {
        let dataInstance = null;
        let leftoversSynced = false;

        const releaseDataInstance = async () => {
          if (dataInstance) {
            await dataInstance.destroy();
            dataInstance = null;
          }
        };

        try {
          for (const action of ctx.state.actions) {
            if (action.kind === 'data') {
              dataInstance = dataInstance ?? (await modelsUtils.createHelperInstance());
              await action.build(ctx, { strapi: dataInstance });
            } else {
              await releaseDataInstance();
              await action.build(ctx, { registerOnly: leftoversSynced });
            }

            leftoversSynced = true;
          }
        } finally {
          await releaseDataInstance();
        }
      });

      return this;
    },

    /**
     * One booted instance deletes the rows, then each schema step is undone with the registries
     * only. The next boot drops the tables, as it did when every step booted the app.
     */
    async cleanup(options = {}) {
      const { enableTestDataAutoCleanup = true } = options;
      const { models, actions } = ctx.state;
      const cleanupStart = performance.now();
      const reversedActions = [...actions].reverse();
      const dataActions = reversedActions.filter((action) => action.kind === 'data');
      const cleansModels = enableTestDataAutoCleanup && models.length > 0;

      if (cleansModels || dataActions.length > 0) {
        const strapi = await modelsUtils.createHelperInstance();

        try {
          if (cleansModels) {
            for (const model of [...models].reverse()) {
              await modelsUtils.cleanupModel(model.uid, { strapi });
            }
          }

          for (const action of dataActions) {
            await action.cleanup(ctx, { strapi });
          }
        } finally {
          await strapi.destroy();
        }
      }

      for (const action of reversedActions) {
        if (action.kind !== 'data') {
          await action.cleanup(ctx, { registerOnly: true });
        }
      }

      profile.record('builder.cleanup', performance.now() - cleanupStart);
      ctx.resetState();

      return this;
    },
  };
};

module.exports = { createTestBuilder };
