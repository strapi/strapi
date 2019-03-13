'use strict';

/**
 * Query.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const pluralize = require('pluralize');
const policyUtils = require('strapi-utils').policy;

const Loaders = require('./Loaders');

module.exports = {
  /**
   * Convert parameters to valid filters parameters.
   *
   * @return Object
   */

  convertToParams: (params, primaryKey) => {
    return Object.keys(params).reduce((acc, current) => {
      return Object.assign(acc, {
        [`${
          primaryKey === current || "id" === current ? "" : "_"
        }${current}`]: params[current]
      });
    }, {});
  },

  /**
   * Security to avoid infinite limit.
   *
   * @return String
   */

  amountLimiting: (params = {}) => {
    if (params.limit && params.limit < 0) {
      params.limit = 0;
    } else if (params.limit && params.limit > strapi.plugins.graphql.config.amountLimit) {
      params.limit = strapi.plugins.graphql.config.amountLimit;
    }

    return params;
  },

  /**
   * Execute policies before the specified resolver.
   *
   * @return Promise or Error.
   */

  composeQueryResolver: function(_schema, plugin, name, isSingular) {
    const params = {
      model: name,
    };

    const model = plugin
      ? strapi.plugins[plugin].models[name]
      : strapi.models[name];

    // Extract custom resolver or type description.
    const { resolver: handler = {} } = _schema;

    let queryName;

    if (isSingular === 'force') {
      queryName = name;
    } else {
      queryName = isSingular
        ? pluralize.singular(name)
        : pluralize.plural(name);
    }

    // Retrieve policies.
    const policies = _.get(handler, `Query.${queryName}.policies`, []);

    // Retrieve resolverOf.
    const resolverOf = _.get(handler, `Query.${queryName}.resolverOf`, '');

    const policiesFn = [];

    // Boolean to define if the resolver is going to be a resolver or not.
    let isController = false;

    // Retrieve resolver. It could be the custom resolver of the user
    // or the shadow CRUD resolver (aka Content-Manager).
    const resolver = (() => {
      // Try to retrieve custom resolver.
      const resolver = _.get(handler, `Query.${queryName}.resolver`);

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
      const controller = isSingular
        ? _.get(controllers, `${name}.findOne`)
        : _.get(controllers, `${name}.find`);

      if (!controller) {
        return new Error(
          `Cannot find the controller's action ${name}.${
            isSingular ? 'findOne' : 'find'
          }`,
        );
      }

      // Push global policy to make sure the permissions will work as expected.
      // We're trying to detect the controller name.
      policiesFn.push(
        policyUtils.globalPolicy(
          undefined,
          {
            handler: `${name}.${isSingular ? 'findOne' : 'find'}`,
          },
          undefined,
          plugin,
        ),
      );

      // Make the query compatible with our controller by
      // setting in the context the parameters.
      if (isSingular) {
        return async (ctx, next) => {
          ctx.params = {
            ...params,
            [model.primaryKey]: ctx.query[model.primaryKey],
          };

          // Return the controller.
          return controller(ctx, next);
        };
      }

      // Plural.
      return controller;
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

    return async (obj, options = {}, { context }) => {
      const _options = _.cloneDeep(options);
      
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

      // Initiliase loaders for this request.
      Loaders.initializeLoader();

      // Resolver can be a function. Be also a native resolver or a controller's action.
      if (_.isFunction(resolver)) {
        // Note: we've to used the Object.defineProperties to reset the prototype. It seems that the cloning the context
        // cause a lost of the Object prototype.
        Object.defineProperties(ctx, {
          query: {
            value: {
              ...this.convertToParams(_.omit(_options, 'where'), model.primaryKey),
              ..._options.where,
              // Avoid population.
              _populate: model.associations.filter(a => !a.dominant && _.isEmpty(a.model)).map(a => a.alias),
            },
            writable: true,
            configurable: true
          },
          params: {
            value: this.convertToParams(this.amountLimiting(_options), model.primaryKey),
            writable: true,
            configurable: true
          }
        });

        if (isController) {
          const values = await resolver.call(null, ctx);

          if (ctx.body) {
            return ctx.body;
          }

          return values && values.toJSON ? values.toJSON() : values;
        }

        return resolver.call(null, obj, _options, ctx);
      }

      // Resolver can be a promise.
      return resolver;
    };
  },
};
