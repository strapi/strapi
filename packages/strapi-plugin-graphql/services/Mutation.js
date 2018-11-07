'use strict';

/**
 * Mutation.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const pluralize = require('pluralize');
const policyUtils = require('strapi-utils').policy;
const Query = require('./Query.js');
/* eslint-disable no-unused-vars */

module.exports = {
  /**
   * Convert parameters to valid filters parameters.
   *
   * @return Object
   */

  convertToParams: params => {
    return Object.keys(params).reduce((acc, current) => {
      return Object.assign(acc, {
        [`_${current}`]: params[current],
      });
    }, {});
  },

  /**
   * Execute policies before the specified resolver.
   *
   * @return Promise or Error.
   */

  composeMutationResolver: function(_schema, plugin, name, action) {
    // Extract custom resolver or type description.
    const { resolver: handler = {} } = _schema;

    const queryName = `${action}${_.capitalize(name)}`;

    // Retrieve policies.
    const policies = _.get(handler, `Mutation.${queryName}.policies`, []);

    // Retrieve resolverOf.
    const resolverOf = _.get(handler, `Mutation.${queryName}.resolverOf`, '');

    const policiesFn = [];

    // Boolean to define if the resolver is going to be a resolver or not.
    let isController = false;

    // Retrieve resolver. It could be the custom resolver of the user
    // or the shadow CRUD resolver (aka Content-Manager).
    const resolver = (() => {
      // Try to retrieve custom resolver.
      const resolver = _.get(handler, `Mutation.${queryName}.resolver`);

      if (_.isString(resolver) || _.isPlainObject(resolver)) {
        const { handler = resolver } = _.isPlainObject(resolver)
          ? resolver
          : {};

        // Retrieve the controller's action to be executed.
        const [name, action] = handler.split('.');

        const controller = plugin
          ? _.get(strapi.plugins, `${plugin}.controllers.${_.toLower(name)}.${action}`)
          : _.get(strapi.controllers, `${_.toLower(name)}.${action}`);

        if (!controller) {
          return new Error(
            `Cannot find the controller's action ${name}.${action}`,
          );
        }

        // We're going to return a controller instead.
        isController = true;

        // Push global policy to make sure the permissions will work as expected.
        policiesFn.push(
          policyUtils.globalPolicy(
            undefined,
            {
              handler: `${name}.${action}`,
            },
            undefined,
            plugin,
          ),
        );

        // Return the controller.
        return controller;
      } else if (resolver) {
        // Function.
        return resolver;
      }

      // We're going to return a controller instead.
      isController = true;

      const controllers = plugin
        ? strapi.plugins[plugin].controllers
        : strapi.controllers;

      // Try to find the controller that should be related to this model.
      const controller = _.get(
        controllers,
        `${name}.${action === 'delete' ? 'destroy' : action}`,
      );

      if (!controller) {
        return new Error(
          `Cannot find the controller's action ${name}.${action}`,
        );
      }

      // Push global policy to make sure the permissions will work as expected.
      // We're trying to detect the controller name.
      policiesFn.push(
        policyUtils.globalPolicy(
          undefined,
          {
            handler: `${name}.${action === 'delete' ? 'destroy' : action}`,
          },
          undefined,
          plugin,
        ),
      );

      // Make the query compatible with our controller by
      // setting in the context the parameters.
      return async (ctx, next) => {
        return controller(ctx, next);
      };
    })();

    // The controller hasn't been found.
    if (_.isError(resolver)) {
      return resolver;
    }

    // Force policies of another action on a custom resolver.
    if (_.isString(resolverOf) && !_.isEmpty(resolverOf)) {
      // Retrieve the controller's action to be executed.
      const [name, action] = resolverOf.split('.');

      const controller = plugin
        ? _.get(strapi.plugins, `${plugin}.controllers.${_.toLower(name)}.${action}`)
        : _.get(strapi.controllers, `${_.toLower(name)}.${action}`);

      if (!controller) {
        return new Error(
          `Cannot find the controller's action ${name}.${action}`,
        );
      }

      policiesFn[0] = policyUtils.globalPolicy(
        undefined,
        {
          handler: `${name}.${action}`,
        },
        undefined,
        plugin,
      );
    }

    if (strapi.plugins['users-permissions']) {
      policies.push('plugins.users-permissions.permissions');
    }

    // Populate policies.
    policies.forEach(policy =>
      policyUtils.get(
        policy,
        plugin,
        policiesFn,
        `GraphQL query "${queryName}"`,
        name,
      ),
    );

    return async (obj, options, { context }) => {
      // Hack to be able to handle permissions for each query.
      const ctx = Object.assign(_.clone(context), {
        request: Object.assign(_.clone(context.request), {
          graphql: null,
        }),
      });

      // Execute policies stack.
      const policy = await strapi.koaMiddlewares.compose(policiesFn)(ctx);

      // Policy doesn't always return errors but they update the current context.
      if (
        _.isError(ctx.request.graphql) ||
        _.get(ctx.request.graphql, 'isBoom')
      ) {
        return ctx.request.graphql;
      }

      // Something went wrong in the policy.
      if (policy) {
        return policy;
      }

      // Resolver can be a function. Be also a native resolver or a controller's action.
      if (_.isFunction(resolver)) {
        context.params = Query.convertToParams(options.input.where || {});
        context.request.body = options.input.data || {};

        if (isController) {
          const values = await resolver.call(null, context);

          if (ctx.body) {
            return {
              [pluralize.singular(name)]: ctx.body,
            };
          }

          const body = values && values.toJSON ? values.toJSON() : values;

          return {
            [pluralize.singular(name)]: body,
          };
        }

        return resolver.call(null, obj, options, context);
      }

      // Resolver can be a promise.
      return resolver;
    };
  },
};
