'use strict';

// eslint-disable-next-line node/no-extraneous-require
const _ = require('lodash');
// eslint-disable-next-line node/no-extraneous-require
const { map, prop } = require('lodash/fp');
const modelsUtils = require('../models');
const { createAction } = require('./action');
const { createEventsManager } = require('./event');
const { sanitizeEntity } = require('../../../packages/strapi-utils');

const events = {
  MODEL_CREATED: 'model.created',
  MODEL_DELETED: 'model.deleted',
  FIXTURES_CREATED: 'fixture.created',
};

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

/**
 * Create a test builder from the given args.
 *
 * A builder allows to create resources (content-types, components, fixtures) that can be cleaned-up easily.
 *
 * @param options The builder's constructor options
 * @param options.initialState {State} The builder's initial state
 *
 * @example ```
 * // Setup the builder
 * const builder = createTestBuilder()
 *    .addContentType(articleModel)
 *    .addComponent(myComponent);
 *
 * // Run the build operations
 * await builder.build();
 *
 * // ...
 *
 * // Cleanup created resources
 * await builder.cleanup();
 * ```
 */
const createTestBuilder = (options = {}) => {
  const { initialState } = options;

  const addAction = (code, ...params) => {
    const action = createAction(code, ...params).setEmitter(_eventsManager);
    _state.actions.push(action);
    return action;
  };

  const getDefaultState = () => ({
    actions: [],
    deleted: [],
    created: [],
    fixtures: {},
    ...initialState,
  });

  const getModelsMap = (type = null) =>
    _.difference(_state.created, _state.deleted)
      // Keep the models with the wanted type (all, content-types, or components)
      .filter(event => _.isNull(type) || _.get(event, 'metadata.type') === type)
      // Flatten the data property to obtain an array of model
      .flatMap(_.property('result'))
      // Transform the array into a map where the key is the model's name
      .reduce((acc, model) => _.merge(acc, { [model.modelName]: model }), {});

  const _state = getDefaultState();

  const _eventsManager = createEventsManager({ allowedEvents: Object.values(events) });

  _eventsManager
    .register(events.MODEL_CREATED, event => _state.created.push(event))
    .register(events.MODEL_DELETED, event => _state.deleted.push(event))
    .register(events.FIXTURES_CREATED, ({ result }) => {
      const existingFixtures = _.get(_state.fixtures, result.model, []);
      _state.fixtures[result.model] = existingFixtures.concat(formatFixtures(result.entries));
    });

  return {
    get models() {
      return getModelsMap();
    },

    get contentTypes() {
      return getModelsMap('ct');
    },

    get components() {
      return getModelsMap('comp');
    },

    get fixtures() {
      return _state.fixtures;
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

    addFixtures(model, entries, { onCreated = null } = {}) {
      addAction('fixture.create', model, entries, () => this.fixtures);

      if (_.isFunction(onCreated)) {
        _eventsManager.register(events.FIXTURES_CREATED, e => {
          const { result } = e;

          // Filters fixture.created events triggered for other models
          if (result.model === model) {
            onCreated(formatFixtures(result.entries));
          }
        });
      }

      return this;
    },

    /**
     * Execute every registered step
     */
    async build() {
      for (const action of _state.actions) {
        await action.execute();
      }
      return this;
    },

    /**
     * Cleanup and delete every model (content-types / components) created by the builder
     */
    async cleanup() {
      // The first model to be created should be the last one deleted
      const createdEvents = _state.created.reverse();

      for (const event of createdEvents) {
        const {
          result,
          metadata: { type },
        } = event;

        // Helpers for the given model
        const isBatchOperation = _.isArray(result);
        const modelType = type === 'ct' ? 'ContentType' : 'Component';
        const pluralSuffix = isBatchOperation ? 's' : '';

        // Pluralized & Type related methods name
        const cleanupMethod = `cleanupModel${pluralSuffix}`;
        const deleteMethod = `delete${modelType}${pluralSuffix}`;

        // Format params
        const uidAttribute = type === 'ct' ? 'modelName' : 'uid';
        const params = isBatchOperation
          ? result.map(prop(uidAttribute))
          : prop(uidAttribute, result);

        // Execute cleanup & delete operations
        await modelsUtils[cleanupMethod](params);
        await modelsUtils[deleteMethod](params);

        // Notify the builder that the created model has been deleted
        _eventsManager.emit(events.MODEL_DELETED, event);
      }
      return this;
    },
  };
};

module.exports = {
  createTestBuilder,
};
