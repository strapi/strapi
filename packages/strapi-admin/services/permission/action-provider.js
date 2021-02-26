'use strict';

const { yup } = require('strapi-utils');
const { isFunction } = require('lodash/fp');
const { validateRegisterProviderAction } = require('../../validation/action-provider');
const { getActionId, createAction } = require('../../domain/action');

const EVENTS = ['actionRegistered', 'actionsCleared'];

const createActionProvider = () => {
  const actions = new Map();
  const eventsCallbacks = new Map(EVENTS.map(event => [event, []]));

  const emit = (event, data) => {
    eventsCallbacks.get(event).forEach(callback => {
      callback(data);
    });
  };

  return {
    /**
     * Get an action
     * @param {String} uid uid given when registering the action
     * @param {String} pluginName name of the plugin which is related to the action
     * @returns {Promise<Action>}
     */
    get(uid, pluginName) {
      const actionId = getActionId({ pluginName, uid });
      return actions.get(actionId);
    },

    /**
     * Get an action by its actionId
     * @param {string} actionId
     * @returns {Action}
     */
    getByActionId(actionId) {
      return actions.get(actionId);
    },

    /**
     * Get all actions stored in an array
     * @returns {Promise<Array<Action>>}
     */
    getAll() {
      return Array.from(actions.values());
    },

    /**
     * Get all actions stored in a Map
     * @returns {Promise<Map<uid, Action>>}
     */
    getAllByMap() {
      return actions;
    },

    /**
     * Register actions
     * @param {Array} newActions actions to register
     */
    register(newActions) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new actions outside of the bootstrap function.`);
      }

      validateRegisterProviderAction(newActions);

      newActions.forEach(newAction => {
        const actionId = getActionId(newAction);
        if (actions.has(actionId)) {
          throw new yup.ValidationError(
            `Duplicated action id: ${actionId}. You may want to change the actions name.`
          );
        }

        const action = createAction(newAction);

        actions.set(actionId, action);
        emit('actionRegistered', action);
      });

      return this;
    },

    /**
     * Clear the actions map
     */
    clear() {
      actions.clear();

      emit('actionsCleared');

      return this;
    },

    /**
     * Adds a callback which will be called when `event` is emitted
     */
    addEventListener(event, callback) {
      if (!EVENTS.includes(event) || !isFunction(callback)) {
        return;
      }

      eventsCallbacks.get(event).push(callback);

      return this;
    },

    /**
     * Removes a callback from event's store
     */
    removeEventListener(event, callbackToRemove) {
      if (!EVENTS.includes(event) || !isFunction(callbackToRemove)) {
        return;
      }

      const callbacks = eventsCallbacks.get(event);

      eventsCallbacks.set(
        event,
        callbacks.filter(cb => cb !== callbackToRemove)
      );

      return this;
    },
  };
};

module.exports = createActionProvider();
