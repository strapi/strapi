'use strict';

const { uniq } = require('lodash');
const permissions = require('./permissions');

/**
 * Creates an handler which check that the permission's action exists in the action registry
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
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */
const createContentAPI = (/* strapi */) => {
  // Add providers
  const providers = {
    action: permissions.providers.createActionProvider(),
    condition: permissions.providers.createConditionProvider(),
  };

  const syncActions = async () => {
    // Register actions
    const apiRoutesName = Object.values(strapi.api)
      .map((api) => api.routes)
      .reduce((acc, routesMap) => {
        const routes = Object.values(routesMap)
          // Only content api routes
          .filter((p) => p.type === 'content-api')
          // Resolve every handler name for each route
          .reduce((a, p) => a.concat(p.routes.map((i) => i.handler)), []);
        return acc.concat(routes);
      }, []);
    const pluginsRoutesname = Object.values(strapi.plugins)
      .map((plugin) => plugin.routes['content-api'] || {})
      .map((p) => (p.routes || []).map((i) => i.handler))
      .flat();
    const actions = apiRoutesName.concat(pluginsRoutesname);
    Promise.all(
      uniq(actions).map((action) =>
        providers.action.register(action).catch(() => {
          console.warn('Trying to add action that already exists', action);
        })
      )
    );
  };

  // create permission engine
  const engine = permissions
    .createPermissionEngine({ providers })
    .on('before-format::validate.permission', createValidatePermissionHandler(providers.action));

  return {
    permissions: {
      engine,
      providers,
      syncActions,
    },
  };
};

module.exports = createContentAPI;
