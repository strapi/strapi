'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Strapi utilities.
const finder = require('strapi-utils').finder;
const regex = require('strapi-utils').regex;
const joijson = require('strapi-utils').joijson;


// Middleware used for every routes.
// Expose the endpoint in `this`.
function globalPolicy(endpoint, value, route) {
  return async (ctx, next) => {
    ctx.request.route = {
      endpoint: _.trim(endpoint),
      controller: _.trim(value.controller),
      action: _.trim(value.action),
      splittedEndpoint: _.trim(route.endpoint),
      verb: route.verb && _.trim(route.verb.toLowerCase())
    };

    await next();
  };
}

module.exports = strapi => function routerChecker(value, endpoint, plugin) {
  const Joi = strapi.koaMiddlewares.routerJoi.Joi;
  const builder = joijson.builder(Joi);
  const route = regex.detectRoute(endpoint);

  // Define controller and action names.
  const handler = _.trim(value.handler).split('.');
  const controller = plugin
    ? strapi.plugins[plugin].controllers[handler[0].toLowerCase()]
    : strapi.controllers[handler[0].toLowerCase()] ||
        strapi.admin.controllers[handler[0].toLowerCase()];

  const action = controller[handler[1]];

  // Retrieve the API's name where the controller is located
  // to access to the right validators
  const currentApiName = finder(strapi.plugins[plugin] || strapi.api || strapi.admin, controller);

  // Init policies array.
  const policies = [];

  // Add the `globalPolicy`.
  policies.push(globalPolicy(endpoint, value, route));

  // Allow string instead of array of policies.
  if (
    !_.isArray(_.get(value, 'config.policies')) &&
    !_.isEmpty(_.get(value, 'config.policies'))
  ) {
    value.config.policies = [value.config.policies];
  }

  if (
    _.isArray(_.get(value, 'config.policies')) &&
    !_.isEmpty(_.get(value, 'config.policies'))
  ) {
    _.forEach(value.config.policies, policy => {
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
          strapi.config.policies[
            policy.replace(globalPolicyPrefix, '').toLowerCase()
          ]
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
          _.get(
            strapi.plugins,
            policySplited[1] +
              '.config.policies.' +
              policySplited[2].toLowerCase()
          )
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
          _.get(
            strapi.plugins,
            plugin + '.config.policies.' + policy.toLowerCase()
          )
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
          _.get(
            strapi.api,
            currentApiName + '.config.policies.' + policy.toLowerCase()
          )
        );
      }

      strapi.log.error(
        'Ignored attempt to bind route `' +
          endpoint +
          '` with unknown policy `' +
          policy +
          '`.'
      );
    });
  }

  // Init validate.
  const validate = {};

  if (
    _.isString(_.get(value, 'config.validate')) &&
    !_.isEmpty(_.get(value, 'config.validate'))
  ) {
    const validator = _.get(
      strapi.api,
      currentApiName + '.validators.' + value.config.validate
    );

    _.merge(
      validate,
      _.mapValues(validator, value => {
        return builder.build(value);
      })
    );
  }

  return {
    route,
    policies,
    action,
    validate
  };
}
