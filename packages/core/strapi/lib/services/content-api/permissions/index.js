'use strict';

const _ = require('lodash');
const { createActionProvider, createConditionProvider } = require('./providers');
const createPermissionEngine = require('./engine');

/**
 * Creates an handler that checks if the permission's action exists in the action registry
 */
const createValidatePermissionHandler =
  (actionProvider) =>
  ({ permission }) => {
    const action = actionProvider.get(permission.action);

    // If the action isn't registered into the action provider, then ignore the permission and warn the user
    if (!action) {
      strapi.log.debug(
        `Unknown action "${permission.action}" supplied when registering a new permission`
      );
      return false;
    }
  };

/**
 * Create instances of providers and permission engine for the core content-API service.
 * Also, expose utilities to get informations about available actions and such.
 *
 * @param {Strapi.Strapi} strapi
 */
module.exports = (strapi) => {
  // NOTE: Here we define both an action and condition provider,
  // but at the moment, we're only using the action one.
  const providers = {
    action: createActionProvider(),
    condition: createConditionProvider(),
  };

  /**
   * Get a tree representation of the available Content API actions
   * based on the methods of the Content API controllers.
   *
   * @note Only actions bound to a content-API route are returned.
   *
   * @return {{ [api: string]: { [controller: string]: string[] }}}
   */
  const getActionsMap = () => {
    const actionMap = {};

    /**
     * Check if a controller's action is bound to the
     * content-api by looking at a potential __type__ symbol
     *
     * @param {object} action
     *
     * @return {boolean}
     */
    const isContentApi = (action) => {
      if (!_.has(action, Symbol.for('__type__'))) {
        return false;
      }

      return action[Symbol.for('__type__')].includes('content-api');
    };

    /**
     * Register actions from a specific API source into the result tree
     *
     * @param {{ [apiName]: { controllers: { [controller]: object } }}} apis The API container
     * @param {string} source The prefix to use in front the API name
     *
     * @return {void}
     */
    const registerAPIsActions = (apis, source) => {
      _.forEach(apis, (api, apiName) => {
        const controllers = _.reduce(
          api.controllers,
          (acc, controller, controllerName) => {
            const contentApiActions = _.pickBy(controller, isContentApi);

            if (_.isEmpty(contentApiActions)) {
              return acc;
            }

            acc[controllerName] = Object.keys(contentApiActions);

            return acc;
          },
          {}
        );

        if (!_.isEmpty(controllers)) {
          actionMap[`${source}::${apiName}`] = { controllers };
        }
      });
    };

    registerAPIsActions(strapi.api, 'api');
    registerAPIsActions(strapi.plugins, 'plugin');

    return actionMap;
  };

  /**
   * Register all the content-API's controllers actions into the action provider.
   * This method make use of the {@link getActionsMap} to generate the list of actions to register.
   *
   * @return {void}
   */
  const registerActions = async () => {
    const actionsMap = getActionsMap();

    // For each API
    for (const [api, value] of Object.entries(actionsMap)) {
      const { controllers } = value;

      // Register controllers methods as actions
      for (const [controller, actions] of Object.entries(controllers)) {
        // Register each action individually
        await Promise.all(
          actions.map((action) => {
            const actionUID = `${api}.${controller}.${action}`;

            return providers.action.register(actionUID, {
              api,
              controller,
              action,
              uid: actionUID,
            });
          })
        );
      }
    }
  };

  // Create an instance of a content-API permission engine
  // and binds a custom validation handler to it
  const engine = createPermissionEngine({ providers }).on(
    'before-format::validate.permission',
    createValidatePermissionHandler(providers.action)
  );

  return {
    engine,
    providers,
    registerActions,
    getActionsMap,
  };
};
