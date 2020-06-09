'use strict';

const _ = require('lodash');
const { yup } = require('strapi-utils');
const { validateRegisterProviderAction } = require('../validation/action-provider');
const { getActionId, createAction } = require('../domain/action');

const actionProviderFactory = () => {
  const actions = new Map();

  return {
    get(uid, pluginName) {
      const actionId = getActionId({ pluginName, uid });
      const action = actions.get(actionId);
      return _.cloneDeep(action);
    },
    getAll() {
      return _.cloneDeep(Array.from(actions.values()));
    },
    getAllByMap() {
      return _.cloneDeep(actions);
    },
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
      });
    },
  };
};

module.exports = actionProviderFactory();
