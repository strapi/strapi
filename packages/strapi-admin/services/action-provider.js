const { yup } = require('strapi-utils');
const { validateRegisterProviderAction } = require('../validation/action-provider');
const { getActionId, createAction } = require('../domain/action');

const actionProviderFactory = () => {
  const actions = new Map();

  return {
    get(uid, pluginName) {
      const actionId = getActionId({ pluginName, uid });
      return actions.find(p => p.actionId === actionId);
    },
    getAll() {
      return Array.from(actions.values());
    },
    register(newActions) {
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
