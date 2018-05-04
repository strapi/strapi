
// Public dependencies.
const _ = require('lodash');
/* eslint-disable prefer-template */
module.exports = {
  get: function (policy, plugin, policies = [], endpoint, currentApiName) {
    // Define global policy prefix.
    const globalPolicyPrefix = 'global.';
    const pluginPolicyPrefix = 'plugins.';
    const policySplited = policy.split('.');

    // Looking for global policy or namespaced.
    if (
      _.startsWith(policy, globalPolicyPrefix, 0) &&
      !_.isEmpty(
        strapi.config.policies,
        policy.replace(globalPolicyPrefix, '')
      )
    ) {
      // Global policy.
      return policies.push(
        this.parsePolicy(strapi.config.policies[
          policy.replace(globalPolicyPrefix, '').toLowerCase()
        ])
      );
    } else if (
      _.startsWith(policy, pluginPolicyPrefix, 0) &&
      strapi.plugins[policySplited[1]] &&
      !_.isUndefined(
        _.get(
          strapi.plugins,
          policySplited[1] +
            '.config.policies.' +
            policySplited[2].toLowerCase()
        )
      )
    ) {
      // Plugin's policies can be used from app APIs with a specific syntax (`plugins.pluginName.policyName`).
      return policies.push(
        this.parsePolicy(_.get(
          strapi.plugins,
          policySplited[1] +
            '.config.policies.' +
            policySplited[2].toLowerCase()
        ))
      );
    } else if (
      !_.startsWith(policy, globalPolicyPrefix, 0) &&
      plugin &&
      !_.isUndefined(
        _.get(
          strapi.plugins,
          plugin + '.config.policies.' + policy.toLowerCase()
        )
      )
    ) {
      // Plugin policy used in the plugin itself.
      return policies.push(
        this.parsePolicy(_.get(
          strapi.plugins,
          plugin + '.config.policies.' + policy.toLowerCase()
        ))
      );
    } else if (
      !_.startsWith(policy, globalPolicyPrefix, 0) &&
      !_.isUndefined(
        _.get(
          strapi.api,
          currentApiName + '.config.policies.' + policy.toLowerCase()
        )
      )
    ) {
      // API policy used in the API itself.
      return policies.push(
        this.parsePolicy(_.get(
          strapi.api,
          currentApiName + '.config.policies.' + policy.toLowerCase()
        ))
      );
    }

    strapi.log.error(`Ignored attempt to bind to ${endpoint} with unknown policy "${policy}"`);
  },

  parsePolicy: (policy) => {
    if (_.isFunction(policy)) {
      return policy;
    }

    return policy.handler;
  },

  // Middleware used for every routes.
  // Expose the endpoint in `this`.
  globalPolicy: (endpoint, value, route = {}, plugin) => {
    return async (ctx, next) => {
      ctx.request.route = {
        endpoint: _.trim(endpoint),
        controller: value.handler.split('.')[0].toLowerCase(),
        action: value.handler.split('.')[1].toLowerCase(),
        splittedEndpoint: _.trim(route.endpoint),
        verb: route.verb && _.trim(route.verb.toLowerCase()),
        plugin
      };

      await next();
    };
  }
};
