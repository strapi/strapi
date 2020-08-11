'use strict';

const { yup } = require('strapi-utils');
const { validateRegisterProviderAction } = require('../../validation/action-provider');
const { getActionId, createAction } = require('../../domain/action');

const createActionProvider = () => {
  const actions = new Map();

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

        actions.set(actionId, createAction(newAction));

        return this;
      });
    },
  };
};

module.exports = createActionProvider();
