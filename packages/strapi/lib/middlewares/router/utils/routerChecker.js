'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Strapi utilities.
const { finder, policy: policyUtils } = require('strapi-utils');

const getMethod = route => _.trim(_.toLower(route.method));
const getEndpoint = route => _.trim(route.path);

module.exports = strapi =>
  function routerChecker(value, plugin) {
    const method = getMethod(value);
    const endpoint = getEndpoint(value);

    // Define controller and action names.
    const [controllerName, actionName] = _.trim(value.handler).split('.');
    const controllerKey = _.toLower(controllerName);

    let controller;

    if (plugin) {
      controller = strapi.plugins[plugin].controllers[controllerKey];
    } else {
      controller =
        strapi.controllers[controllerKey] ||
        strapi.admin.controllers[controllerKey];
    }

    const action = controller[actionName].bind(controller);

    // Retrieve the API's name where the controller is located
    // to access to the right validators
    const currentApiName = finder(
      strapi.plugins[plugin] || strapi.api || strapi.admin,
      controller
    );

    // Init policies array.
    const policies = [];

    // Add the `globalPolicy`.
    policies.push(
      policyUtils.globalPolicy({
        controller: controllerKey,
        action: actionName,
        method,
        endpoint,
        plugin,
      })
    );

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
        policyUtils.get(
          policy,
          plugin,
          policies,
          `${method} ${endpoint}`,
          currentApiName
        );
      });
    }

    policies.push(async (ctx, next) => {
      // Set body.
      const values = await next();

      if (!ctx.body) {
        ctx.body = values;
      }
    });

    return {
      method,
      endpoint,
      policies,
      action,
    };
  };
