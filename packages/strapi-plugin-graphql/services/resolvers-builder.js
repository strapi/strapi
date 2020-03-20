/**
 * Build queries and mutation resolvers
 */

'use strict';

const _ = require('lodash');
const compose = require('koa-compose');

const { convertToParams, convertToQuery, amountLimiting } = require('./utils');
const { policy: policyUtils } = require('strapi-utils');

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
    return async (root, options = {}, graphqlContext) => {
      const ctx = buildMutationContext({ options, graphqlContext });

      await policiesMiddleware(ctx);
      graphqlContext.context = ctx;

      return resolver(root, options, graphqlContext);
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
    return async (root, options = {}, graphqlContext) => {
      const { ctx, opts } = buildQueryContext({ options, graphqlContext });

      await policiesMiddleware(ctx);
      graphqlContext.context = ctx;

      return resolver(root, opts, graphqlContext);
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

const getAction = resolver => {
  if (!_.isString(resolver)) {
    throw new Error(`Error building query. Expected a string, got ${resolver}`);
  }

  const actionDetails = getActionDetails(resolver);
  const actionFn = getActionFn(actionDetails);

  if (!actionFn) {
    throw new Error(
      `[GraphQL] Cannot find action "${resolver}". Check your graphql configurations.`
    );
  }

  return actionFn;
};

const getActionFn = details => {
  const { controller, action, plugin, api } = details;

  if (plugin) {
    return _.get(strapi.plugins, [_.toLower(plugin), 'controllers', _.toLower(controller), action]);
  }

  return _.get(strapi.api, [_.toLower(api), 'controllers', _.toLower(controller), action]);
};

const getActionDetails = resolver => {
  if (resolver.startsWith('plugins::')) {
    const [, path] = resolver.split('::');
    const [plugin, controller, action] = path.split('.');

    return { plugin, controller, action };
  }

  if (resolver.startsWith('application::')) {
    const [, path] = resolver.split('::');
    const [api, controller, action] = path.split('.');

    return { api, controller, action };
  }

  const args = resolver.split('.');

  if (args.length === 3) {
    const [api, controller, action] = args;
    return { api, controller, action };
  }

  // if direct api access
  if (args.length === 2) {
    const [controller, action] = args;
    return { api: controller, controller, action };
  }

  throw new Error(
    `[GraphQL] Could not find action for resolver "${resolver}". Check your graphql configurations.`
  );
};

/**
 * Checks if a resolverPath (resolver or resovlerOf) might be resolved
 */
const isResolvablePath = path => _.isString(path) && !_.isEmpty(path);

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
};
