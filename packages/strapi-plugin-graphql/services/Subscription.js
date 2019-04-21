'use strict';

/**
 * Subscription.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const policyUtils = require('strapi-utils').policy;
const Query = require('./Query.js');
/* eslint-disable no-unused-vars */

const { RedisPubSub } = require('graphql-redis-subscriptions');
const { PubSub } = require('graphql-subscriptions');
const Redis = require('ioredis');

const options = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 1,
  retry_strategy: options => {
    // reconnect after
    return Math.max(options.attempt * 100, 3000);
  }
};

const pubsub =
['production', 'staging'].indexOf(process.env.NODE_ENV) >= 0 &&
process.env.REDIS_HOST ?
new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options)
}) :
new PubSub();

module.exports = {
  /**
   * Execute policies before the specified resolver.
   *
   * @return Promise or Error.
   */

  composeSubscriptionResolver: function (_schema, plugin, name, action) {
    // Extract custom resolver or type description.
    const { resolver: handler = {} } = _schema;

    const queryName = `${action}${_.capitalize(name)}`;
    const resolverOf = `${_.capitalize(name)}.${action}`;

    let policyName;
    switch (action) {
      case 'beforeFetchAll':
      case 'afterFetchAll':
        policyName = 'find';
        break;
      case 'beforeFetch':
      case 'afterFetch':
        policyName = 'findone';
        break;
      case 'beforeCreate':
      case 'afterCreate':
      case 'beforeSave':
      case 'afterSave':
        policyName = 'create';
        break;
      case 'beforeUpdate':
      case 'afterUpdate':
        policyName = 'update';
        break;
      case 'beforeDestroy':
      case 'afterDestroy':
        policyName = 'destroy';
        break;
      default:
        policyName = policyName;
        break;
    }

    // Retrieve policies.
    const policies = _.get(handler, `Subscription.${action}.policies`, []);
    const models = plugin ? strapi.plugins[plugin].models : strapi.models;

    const policiesFn = [];

    // Retrieve resolver. It could be the custom resolver of the user
    // or the shadow CRUD resolver (aka Content-Manager).
    const resolver = (() => {
      

      const model = models[name];

      // Push global policy to make sure the permissions will work as expected.
      // We're trying to detect the model name.
      policiesFn.push(
        policyUtils.globalPolicy(
          undefined,
          {
            handler: `${name}.${policyName}`,
          },
          undefined,
          plugin
        )
      );

      switch (action) {
        case 'beforeCreate':
        case 'afterCreate':
          model[action] = async (obj) => {
            if (!obj.attributes)
              return;

            pubsub.publish(`${queryName}`, {
              [`${queryName}`]: {
                [`${name}`]: {
                  ...obj.attributes,
                  ...obj.relations
                }
              }
            });
          }
          break;
        case 'beforeFetchAll':
        case 'afterFetchAll':
          model[action] = async (obj) => {
            if (!obj.models.length)
              return;

            pubsub.publish(`${queryName}`, {
              [`${queryName}`]: {
                [`${name}`]: obj.models.map(x => {
                  var model = {
                    ...x.attributes
                  }
                  _.keys(x.relations).map(y => {
                    model[y] = x.attributes || x.relations[y].models.map(z => z.attributes);
                  });

                  return model;
                })
              }
            });
          }
          break;
        default:
          model[action] = async (obj) => {
            if (!obj.attributes)
              return;

            pubsub.publish(`${queryName}_${obj.attributes.id}`, {
              [`${queryName}`]: {
                [`${name}`]: {
                  ...obj.attributes,
                  ...obj.relations
                }
              }
            });
          }
          break;
      }

      // Make the query compatible with our model by
      // setting in the context the parameters.
      return (ctx, next) => {
        switch (action) {
          case 'beforeCreate':
          case 'afterCreate':
          case 'beforeFetchAll':
          case 'afterFetchAll':
            return pubsub.asyncIterator(`${queryName}`);
          default:
            return pubsub.asyncIterator(`${queryName}_${ctx.params.id}`);
        }
      }
    })();

    if (strapi.plugins['users-permissions']) {
      policies.push('plugins.users-permissions.permissions');
    }

    // Populate policies.
    policies.forEach(policy => {
      policyUtils.get(policy, plugin, policiesFn, `GraphQL query "${policyName}"`, name);
    });

    return {
      resolverOf,
      subscribe: async (obj, options, context) => {
        context = Object.assign(context.context || context, {
          request: {},
          send: (res) => { context.body = res }
        });

        // Hack to be able to handle permissions for each subscription.
        const ctx = Object.assign(_.clone(context), {
          request: Object.assign(_.clone(context.request), {
            graphql: null,
          }),
        });

        // Execute policies stack.
        const policy = await strapi.koaMiddlewares.compose(policiesFn)(ctx);

        // Policy doesn't always return errors but they update the current context.
        if (_.isError(ctx.request.graphql) || _.get(ctx.request.graphql, 'isBoom')) {
          return ctx.request.graphql;
        }

        // Something went wrong in the policy.
        if (policy) {
          return policy;
        }

        // Resolver can only be a function.
        if (_.isFunction(resolver)) {
          ctx.params = Query.convertToParams(
            options || {},
            (plugin ? strapi.plugins[plugin].models[name] : strapi.models[name]).primaryKey
          );

          return resolver(ctx);
        }

        // Hopefully Resolver can be a promise.
        return resolver;
      }
    }
  }
};
