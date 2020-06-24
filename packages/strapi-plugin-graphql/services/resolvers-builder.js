/**
 * Build queries and mutation resolvers
 */

'use strict';

const _ = require('lodash');
const compose = require('koa-compose');

const { RedisPubSub } = require('graphql-redis-subscriptions');
const { PubSub } = require('graphql-subscriptions');
const Redis = require('ioredis');
const { policy: policyUtils } = require('strapi-utils');
const {
  convertToParams,
  convertToQuery,
  amountLimiting,
  getAction,
  getActionDetails,
  isResolvablePath,
} = require('./utils');

//Choose between Redis and standart PubSub if Redis config is present
const pubsub = (() => {
  if (strapi.config.hook.settings.redis) {
    const options = {
      host: strapi.config.hook.settings.redis.host,
      port: strapi.config.hook.settings.redis.port,
      password: strapi.config.hook.settings.redis.password,
      db: strapi.config.hook.settings.redis.options.db,
      retry_strategy: options => {
        // reconnect after
        return Math.max(options.attempt * 100, 3000);
      },
    };
    return new RedisPubSub({
      publisher: new Redis(options),
      subscriber: new Redis(options),
    });
  } else {
    return new PubSub();
  }
})();

strapi.graphql = {
  pubsub,
};

const buildMutation = (mutationName, config) => {
  const { resolver, resolverOf, transformOutput = _.identity } = config;

  if (_.isFunction(resolver) && !isResolvablePath(resolverOf)) {
    throw new Error(
      `Cannot create mutation "${mutationName}". Missing "resolverOf" option with custom resolver.`
    );
  }

  const policiesMiddleware = compose(getPolicies(config));

  // custom resolvers
  if (_.isFunction(resolver)) {
    return async (root, options = {}, graphqlContext, info) => {
      const ctx = buildMutationContext({ options, graphqlContext });

      await policiesMiddleware(ctx);
      graphqlContext.context = ctx;

      return resolver(root, options, graphqlContext, info);
    };
  }

  const action = getAction(resolver);

  return async (root, options = {}, graphqlContext) => {
    const ctx = buildMutationContext({ options, graphqlContext });

    await policiesMiddleware(ctx);

    const values = await action(ctx);
    const result = ctx.body || values;

    if (_.isError(result)) {
      throw result;
    }

    return transformOutput(result);
  };
};

const buildMutationContext = ({ options, graphqlContext }) => {
  const { context } = graphqlContext;

  const ctx = context.app.createContext(_.clone(context.req), _.clone(context.res));

  if (options.input && options.input.where) {
    ctx.params = convertToParams(options.input.where || {});
  } else {
    ctx.params = {};
  }

  if (options.input && options.input.data) {
    ctx.request.body = options.input.data || {};
  } else {
    ctx.request.body = options;
  }

  return ctx;
};

const buildSubscription = (subscriptionName, config, model) => {
  const { resolver, resolverOf, subscribe, transformOutput = _.identity } = config;

  if (_.isFunction(subscribe)) {
    if (!resolverOf) {
      throw new Error(
        `Cannot create subscription "${subscriptionName}". Missing "resolverOf" option with custom resolver.`
      );
    }

    const actionDetails = getActionDetails(resolverOf);

    const policiesMiddleware = compose(getPolicies(config));

    return {
      resolverOf,
      subscribe: async (root, options = {}, graphqlContext, info) => {
        const ctx = buildSubscriptionContext({ options, graphqlContext, actionDetails });

        await policiesMiddleware(ctx);
        if (ctx.body && (_.isError(ctx.body) || ctx.body.error)) {
          if (ctx.body instanceof Error) throw ctx.body;
          throw new Error(ctx.body.error);
        }

        return subscribe(root, options, ctx, info);
      },
    };
  } else if (!_.isString(resolver)) {
    throw new Error(`Error building query. Expected a string, got ${resolver}`);
  } else {
    const actionDetails = getActionDetails(resolver);

    if (!model.lifecycles || !model.lifecycles[actionDetails.action]) {
      return {};
    }

    //Replace subscription action with the coresponding model action
    config.resolver = config.resolver.replace(
      actionDetails.action,
      getSubscriptionActionName(actionDetails.action)
    );

    const policiesMiddleware = compose(getPolicies(config));

    const asyncResolver = (() => {
      const _originalTrigger = model.lifecycles[actionDetails.action];

      switch (actionDetails.action) {
        case 'beforeFind':
          model.lifecycles[actionDetails.action] = async (params, populate) => {
            _originalTrigger(params, populate);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: [],
              },
            });
          };
          break;
        case 'afterFind':
          model.lifecycles[actionDetails.action] = async (results, params, populate) => {
            _originalTrigger(results, params, populate);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: results,
              },
            });
          };
          break;
        case 'beforeFindOne':
          model.lifecycles[actionDetails.action] = async (params, populate) => {
            _originalTrigger(params, populate);
            pubsub.publish(`${resolver}_${params.id}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: params,
              },
            });
          };
          break;
        case 'afterFindOne':
          model.lifecycles[actionDetails.action] = async (result, params, populate) => {
            _originalTrigger(result, params, populate);
            pubsub.publish(`${resolver}_${params.id}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: result,
              },
            });
          };
          break;
        case 'beforeCreate':
          model.lifecycles[actionDetails.action] = async data => {
            _originalTrigger(data);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: data,
              },
            });
          };
          break;
        case 'afterCreate':
          model.lifecycles[actionDetails.action] = async (result, data) => {
            _originalTrigger(result, data);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: result,
              },
            });
          };
          break;
        case 'beforeUpdate':
          model.lifecycles[actionDetails.action] = async (params, data) => {
            _originalTrigger(params, data);
            pubsub.publish(`${resolver}_${params.id}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: data,
              },
            });
          };
          break;
        case 'afterUpdate':
          model.lifecycles[actionDetails.action] = async (result, params, data) => {
            _originalTrigger(result, params, data);
            pubsub.publish(`${resolver}_${params.id}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: result,
              },
            });
          };
          break;
        case 'beforeDelete':
          model.lifecycles[actionDetails.action] = async params => {
            _originalTrigger(params);
            pubsub.publish(`${resolver}_${params.id}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: params,
              },
            });
          };
          break;
        case 'afterDelete':
          model.lifecycles[actionDetails.action] = async (result, params) => {
            _originalTrigger(result, params);
            pubsub.publish(`${resolver}_${params.id}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: params,
              },
            });
          };
          break;
        case 'beforeDeleteAll':
          model.lifecycles[actionDetails.action] = async (params, populate) => {
            _originalTrigger(params, populate);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: [],
              },
            });
          };
          break;
        case 'afterDeleteAll':
          model.lifecycles[actionDetails.action] = async (result, params) => {
            _originalTrigger(result, params);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: result,
              },
            });
          };
          break;
        case 'beforeCount':
          model.lifecycles[actionDetails.action] = async params => {
            _originalTrigger(params);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                count: 0,
              },
            });
          };
          break;
        case 'afterCount':
          model.lifecycles[actionDetails.action] = async (result, params) => {
            _originalTrigger(result, params);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                count: result,
              },
            });
          };
          break;
        case 'beforeSearch':
          model.lifecycles[actionDetails.action] = async (params, populate) => {
            _originalTrigger(params, populate);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: [],
              },
            });
          };
          break;
        case 'afterSearch':
          model.lifecycles[actionDetails.action] = async (result, params) => {
            _originalTrigger(result, params);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                [`${model.modelName}`]: result,
              },
            });
          };
          break;
        case 'beforeCountSearch':
          model.lifecycles[actionDetails.action] = async params => {
            _originalTrigger(params);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                count: 0,
              },
            });
          };
          break;
        case 'afterCountSearch':
          model.lifecycles[actionDetails.action] = async (result, params) => {
            _originalTrigger(result, params);
            pubsub.publish(`${resolver}`, {
              [`${actionDetails.action}${_.upperFirst(model.modelName)}`]: {
                count: result,
              },
            });
          };
          break;
      }

      return async (root, options, ctx) => {
        switch (actionDetails.action) {
          case 'beforeCreate':
          case 'afterCreate':
          case 'beforeFind':
          case 'afterFind':
          case 'beforeCount':
          case 'afterCount':
          case 'beforeSearch':
          case 'afterSearch':
          case 'beforeCountSearch':
          case 'afterCountSearch':
            return pubsub.asyncIterator(`${resolver}`);
          default:
            return pubsub.asyncIterator(`${resolver}_${ctx.params.id}`);
        }
      };
    })();

    return {
      resolverOf,
      subscribe: async (root, options = {}, graphqlContext, info) => {
        const ctx = buildSubscriptionContext({ options, graphqlContext, actionDetails });

        await policiesMiddleware(ctx);
        if (ctx.body && (_.isError(ctx.body) || ctx.body.error)) {
          if (ctx.body instanceof Error) throw ctx.body;
          throw new Error(ctx.body.error);
        }

        return asyncResolver.call(null, root, options, ctx, info);
      },
    };
  }
};

const buildSubscriptionContext = ({ options, graphqlContext, actionDetails }) => {
  const { context } = graphqlContext;

  const ctx = context.app.createContext(_.clone(context.req), _.clone(context.res));

  if (options) {
    ctx.params = convertToParams(options || {});
  } else {
    ctx.params = {};
  }

  ctx.route = ctx.route || {
    type: actionDetails.source,
    controller: actionDetails.controller,
    action: getSubscriptionActionName(actionDetails.action),
  };

  return ctx;
};

const getSubscriptionActionName = action => {
  switch (action) {
    case 'beforeFind':
    case 'afterFind':
      return 'find';
    case 'beforeFindOne':
    case 'afterFindOne':
      return 'findOne';
    case 'beforeCreate':
    case 'afterCreate':
      return 'create';
    case 'beforeUpdate':
    case 'afterUpdate':
      return 'update';
    case 'beforeDelete':
    case 'afterDelete':
      return 'destroy';
    case 'beforeDeleteAll':
    case 'afterDeleteAll':
      return 'destroyAll';
    case 'beforeCount':
    case 'afterCount':
      return 'count';
    case 'beforeSearch':
    case 'afterSearch':
      return 'find';
    case 'beforeCountSearch':
    case 'afterCountSearch':
      return 'count';
    default:
      return action;
  }
};

const buildQuery = (queryName, config) => {
  const { resolver } = config;

  try {
    validateResolverOption(config);
  } catch (error) {
    throw new Error(`Cannot create query "${queryName}": ${error.message}`);
  }

  const policiesMiddleware = compose(getPolicies(config));

  // custom resolvers
  if (_.isFunction(resolver)) {
    return async (root, options = {}, graphqlContext, info) => {
      const { ctx, opts } = buildQueryContext({ options, graphqlContext });

      await policiesMiddleware(ctx);
      graphqlContext.context = ctx;

      return resolver(root, opts, graphqlContext, info);
    };
  }

  const action = getAction(resolver);

  return async (root, options = {}, graphqlContext) => {
    const { ctx } = buildQueryContext({ options, graphqlContext });

    // duplicate context
    await policiesMiddleware(ctx);

    const values = await action(ctx);
    const result = ctx.body || values;

    if (_.isError(result)) {
      throw result;
    }

    return result;
  };
};

const validateResolverOption = config => {
  const { resolver, resolverOf, policies } = config;

  if (_.isFunction(resolver) && !isResolvablePath(resolverOf)) {
    throw new Error(`Missing "resolverOf" option with custom resolver.`);
  }

  if (!_.isUndefined(policies) && (!Array.isArray(policies) || !_.every(policies, _.isString))) {
    throw new Error('Policies option must be an array of string.');
  }

  return true;
};

const buildQueryContext = ({ options, graphqlContext }) => {
  const { context } = graphqlContext;
  const _options = _.cloneDeep(options);

  const ctx = context.app.createContext(_.clone(context.req), _.clone(context.res));

  // Note: we've to used the Object.defineProperties to reset the prototype. It seems that the cloning the context
  // cause a lost of the Object prototype.
  const opts = amountLimiting(_options);

  ctx.query = {
    ...convertToParams(_.omit(opts, 'where')),
    ...convertToQuery(opts.where),
  };

  ctx.params = convertToParams(opts);

  return { ctx, opts };
};

/**
 * Checks if a resolverPath (resolver or resovlerOf) might be resolved
 */

const getPolicies = config => {
  const { resolver, policies = [], resolverOf } = config;

  const { api, plugin } = config['_metadatas'] || {};

  const policyFns = [];

  const { controller, action, plugin: pathPlugin } = isResolvablePath(resolverOf)
    ? getActionDetails(resolverOf)
    : getActionDetails(resolver);

  const globalPolicy = policyUtils.globalPolicy({
    controller,
    action,
    plugin: pathPlugin,
  });

  policyFns.push(globalPolicy);

  if (strapi.plugins['users-permissions']) {
    policies.unshift('plugins::users-permissions.permissions');
  }

  policies.forEach(policy => {
    const policyFn = policyUtils.get(policy, plugin, api);
    policyFns.push(policyFn);
  });

  return policyFns;
};

module.exports = {
  buildQuery,
  buildMutation,
  buildSubscription,
};
