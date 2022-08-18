'use strict';

const { uniq } = require('lodash');
const permissions = require('./permissions');
/**
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */
const createContentAPI = (/* strapi */) => {
  const syncActions = async () => {
    /**
     * NOTE: For some reason, this doesn't seem to be necessary because all the routes exist
     * createActionProvider uses a providerFactory, which seems to already include everything, and when we try
     * to register our actions we get an error that the keys already exist
     * Could providerFactory not be providing a new provider, and instead sharing the registry with everything that uses it?
     *
     * If this isn't an issue to fix and is expected, we don't need the route registration code below and it should be removed
     * */
    // Start of route registration
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
          console.log('Key already exists', action);
        })
      )
    );
  };
  // End of route registration

  // Add providers
  const providers = {
    action: permissions.providers.createActionProvider(),
    condition: permissions.providers.createConditionProvider(),
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

module.exports = createContentAPI;
