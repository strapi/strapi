'use strict';

// eslint-disable-next-line node/no-extraneous-require
const _ = require('lodash');
const modelsUtils = require('../models');
const { createAction } = require('./action');
const { createEventsManager } = require('./event');

const events = {
  MODEL_CREATED: 'model.created',
  MODEL_DELETED: 'model.deleted',
  FIXTURES_CREATED: 'fixture.created',
};

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
    const action = createAction(code, ...params).setEmitter(eventManager);
    _state.actions.push(action);
  };
  const getDefaultState = () => ({ actions: [], deleted: [], created: [], ...initialState });
  const getModelsMap = (type = null) => _.difference(_state.created, _state.deleted)
    // Keep the models with the wanted type (all, content-types, or components)
    .filter(event => _.isNull(type) || _.get(event, 'metadata.type') === type)
    // Flatten the data property to obtain an array of model
    .flatMap(_.property('result'))
    // Transform the array into a map where the key is the model's name
    .reduce((acc, model) => _.merge(acc, { [model.modelName]: model }), {});

  /**
   * Internal builder's state
   */
  const _state = getDefaultState();

  const eventManager = createEventsManager({ allowedEvents: Object.values(events) });

  eventManager
    .register(events.MODEL_CREATED, event => _state.created.push(event))
    .register(events.MODEL_DELETED, event => _state.deleted.push(event));

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

    /**
     *
     * @param type
     * @param model
     * @returns {this}
     */
    addModel(type, model) {
      addAction(`${type}.create`, model);
      return this;
    },

    addContentType(contentType) {
      return this.addModel('ct', contentType);
    },

    addContentTypes(contentTypes, { batch = true } = {}) {
      addAction(batch ? 'ct.createBatch' : 'ct.createMany', contentTypes);
      return this;
    },

    addComponent(component) {
      return this.addModel('comp', component);
    },

    addFixtures(model, entries, { onCreated = null } = {}) {
      addAction('fixture.create', model, entries);

      if (_.isFunction(onCreated)) {
        eventManager.register(events.FIXTURES_CREATED, e => {
          const { result } = e;

          // Filters fixture.created events triggered for other models
          if (result.model === model) {
            onCreated(entries);
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
      return this
    },

    /**
     * Cleanup and delete every model (content-types / components) created by the builder
     */
    async cleanup() {
      // The first model to be created should be the last one deleted
      const createdEvents = _state.created.reverse();

      console.log('About to delete created models', createdEvents)
      for (const event of createdEvents) {
        const { result, metadata: { type } } = event;

        // Helpers for the given model
        const isBatchOperation = _.isArray(result);
        const modelType = type === 'ct' ? 'ContentType' : 'Component';
        const pluralSuffix = isBatchOperation ? 's' : '';

        // Pluralized & Type related methods name
        const deleteMethod = `delete${modelType}${pluralSuffix}`;
        const cleanupMethod = `cleanupModel${pluralSuffix}`;

        // Data to send to every method
        const params = isBatchOperation ? result.map(model => model.modelName) : result.modelName;

        // Execute every needed operation
        await modelsUtils[cleanupMethod](params);
        await modelsUtils[deleteMethod](params);

        // Notify the builder that the created model has been deleted
        eventManager.emit(events.MODEL_DELETED, event);
      }
      return this;
    },
  };
}


module.exports = {
  createTestBuilder,
};
