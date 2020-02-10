'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const { gql, makeExecutableSchema } = require('apollo-server-koa');
const _ = require('lodash');
const graphql = require('graphql');
const Types = require('./Types.js');
const Resolvers = require('./Resolvers.js');
const {
  mergeSchemas,
  createDefaultSchema,
  diffResolvers,
  convertToParams,
  convertToQuery,
  amountLimiting,
} = require('./utils');

const policyUtils = require('strapi-utils').policy;
const compose = require('koa-compose');

/**
 * Receive an Object and return a string which is following the GraphQL specs.
 *
 * @return String
 */

const formatGQL = (fields, description = {}, model = {}, type = 'field') => {
  const typeFields = JSON.stringify(fields, null, 2).replace(/['",]+/g, '');

  const lines = typeFields.split('\n');

  // Try to add description for field.
  if (type === 'field') {
    return lines
      .map(line => {
        if (['{', '}'].includes(line)) {
          return '';
        }

        const split = line.split(':');
        const attribute = _.trim(split[0]);
        const info =
          (_.isString(description[attribute])
            ? description[attribute]
            : _.get(description[attribute], 'description')) ||
          _.get(model, `attributes.${attribute}.description`);
        const deprecated =
          _.get(description[attribute], 'deprecated') ||
          _.get(model, `attributes.${attribute}.deprecated`);

        // Snakecase an attribute when we find a dash.
        if (attribute.indexOf('-') !== -1) {
          line = `  ${_.snakeCase(attribute)}: ${_.trim(split[1])}`;
        }

        if (info) {
          line = `  """\n    ${info}\n  """\n${line}`;
        }

        if (deprecated) {
          line = `${line} @deprecated(reason: "${deprecated}")`;
        }

        return line;
      })
      .join('\n');
  } else if (type === 'query' || type === 'mutation') {
    return lines
      .map((line, index) => {
        if (['{', '}'].includes(line)) {
          return '';
        }

        const split = Object.keys(fields)[index - 1].split('(');
        const attribute = _.trim(split[0]);
        const info = _.get(description[attribute], 'description');
        const deprecated = _.get(description[attribute], 'deprecated');

        // Snakecase an attribute when we find a dash.
        if (attribute.indexOf('-') !== -1) {
          line = `  ${_.snakeCase(attribute)}(${_.trim(split[1])}`;
        }

        if (info) {
          line = `  """\n    ${info}\n  """\n${line}`;
        }

        if (deprecated) {
          line = `${line} @deprecated(reason: "${deprecated}")`;
        }

        return line;
      })
      .join('\n');
  }

  return lines
    .map((line, index) => {
      if ([0, lines.length - 1].includes(index)) {
        return '';
      }

      return line;
    })
    .join('\n');
};

/**
 * Retrieve description from variable and return a string which follow the GraphQL specs.
 *
 * @return String
 */

const getDescription = (type, model = {}) => {
  const format = '"""\n';

  const str = _.get(type, '_description') || _.get(model, 'info.description');

  if (str) {
    return `${format}${str}\n${format}`;
  }

  return '';
};

/**
 * Generate GraphQL schema.
 *
 * @return Schema
 */

const generateSchema = () => {
  const shadowCRUDEnabled = strapi.plugins.graphql.config.shadowCRUD !== false;

  // Generate type definition and query/mutation for models.
  const shadowCRUD = shadowCRUDEnabled
    ? buildShadowCRUD()
    : createDefaultSchema();

  const _schema = strapi.plugins.graphql.config._schema.graphql;

  // Extract custom definition, query or resolver.
  const { definition, query, mutation, resolver = {} } = _schema;

  // Polymorphic.
  const polymorphicSchema = Types.addPolymorphicUnionType(
    definition + shadowCRUD.definition
  );

  const builtResolvers = _.merge(
    {},
    shadowCRUD.resolvers,
    polymorphicSchema.resolvers
  );

  const extraResolvers = diffResolvers(_schema.resolver, builtResolvers);

  const resolvers = _.merge({}, builtResolvers, buildResolvers(extraResolvers));

  // Return empty schema when there is no model.
  if (_.isEmpty(shadowCRUD.definition) && _.isEmpty(definition)) {
    return {};
  }

  const queryFields =
    shadowCRUD.query &&
    formatGQL(shadowCRUD.query, resolver.Query, null, 'query');

  const mutationFields =
    shadowCRUD.mutation &&
    formatGQL(shadowCRUD.mutation, resolver.Mutation, null, 'mutation');

  const scalars = Types.getScalars();

  Object.assign(resolvers, scalars);
  const scalarDef = Object.keys(scalars)
    .map(key => `scalar ${key}`)
    .join('\n');

  // Concatenate.
  let typeDefs = `
      ${definition}
      ${shadowCRUD.definition}
      ${polymorphicSchema.definition}

      ${Types.addInput()}

      type Query {
        ${queryFields}
        ${query}
      }

      type Mutation {
        ${mutationFields}
        ${mutation}
      }

      ${scalarDef}
    `;

  // // Build schema.
  if (!strapi.config.currentEnvironment.server.production) {
    // Write schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    writeGenerateSchema(graphql.printSchema(schema));
  }

  // Remove custom scalar (like Upload);
  typeDefs = Types.removeCustomScalar(typeDefs, resolvers);

  return {
    typeDefs: gql(typeDefs),
    resolvers,
  };
};

/**
 * Save into a file the readable GraphQL schema.
 *
 * @return void
 */

const writeGenerateSchema = schema => {
  return strapi.fs.writeAppFile('exports/graphql/schema.graphql', schema);
};

const buildShadowCRUD = () => {
  const modelSchema = Resolvers.buildShadowCRUD(
    _.omitBy(strapi.models, model => model.internal === true)
  );

  const pluginSchemas = Object.keys(strapi.plugins).reduce((acc, plugin) => {
    const schemas = Resolvers.buildShadowCRUD(strapi.plugins[plugin].models);
    return acc.concat(schemas);
  }, []);

  const componentSchemas = Object.values(strapi.components).map(compo =>
    Resolvers.buildComponent(compo)
  );

  const schema = { definition: '', resolvers: {}, query: {}, mutation: {} };
  mergeSchemas(schema, modelSchema, ...pluginSchemas, ...componentSchemas);

  return schema;
};

const buildResolvers = resolvers => {
  // Transform object to only contain function.
  return Object.keys(resolvers).reduce((acc, type) => {
    if (graphql.isScalarType(resolvers[type])) {
      return acc;
    }

    return Object.keys(resolvers[type]).reduce((acc, resolverName) => {
      const resolverObj = resolvers[type][resolverName];

      // Disabled this query.
      if (resolverObj === false) return acc;

      if (_.isFunction(resolverObj)) {
        return _.set(acc, [type, resolverName], resolverObj);
      }

      switch (type) {
        case 'Mutation': {
          _.set(
            acc,
            [type, resolverName],
            buildMutation(resolverName, resolverObj)
          );

          break;
        }
        default: {
          _.set(
            acc,
            [type, resolverName],
            buildQuery(resolverName, resolverObj)
          );
          break;
        }
      }

      return acc;
    }, acc);
  }, {});
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
    return async (root, options = {}, graphqlContext) => {
      const ctx = buildMutationContext({ options, graphqlContext });

      await policiesMiddleware(ctx);
      return resolver(root, options, graphqlContext);
    };
  }

  const action = getAction(resolver);

  return async (root, options = {}, graphqlContext) => {
    const { context } = graphqlContext;
    const ctx = buildMutationContext({ options, graphqlContext });

    await policiesMiddleware(ctx);

    const values = await action(context);
    const result = ctx.body || values;

    if (_.isError(result)) {
      throw result;
    }

    return transformOutput(result);
  };
};

const buildMutationContext = ({ options, graphqlContext }) => {
  const { context } = graphqlContext;

  if (options.input && options.input.where) {
    context.params = convertToParams(options.input.where || {});
  } else {
    context.params = {};
  }

  if (options.input && options.input.data) {
    context.request.body = options.input.data || {};
  } else {
    context.request.body = options;
  }

  const ctx = context.app.createContext(
    _.clone(context.req),
    _.clone(context.res)
  );

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

  if (
    !_.isUndefined(policies) &&
    (!Array.isArray(policies) || !_.every(policies, _.isString))
  ) {
    throw new Error('Policies option must be an array of string.');
  }

  return true;
};

const buildQueryContext = ({ options, graphqlContext }) => {
  const { context } = graphqlContext;
  const _options = _.cloneDeep(options);

  const ctx = context.app.createContext(
    _.clone(context.req),
    _.clone(context.res)
  );

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
    return _.get(strapi.plugins, [
      _.toLower(plugin),
      'controllers',
      _.toLower(controller),
      action,
    ]);
  }

  return _.get(strapi.api, [
    _.toLower(api),
    'controllers',
    _.toLower(controller),
    action,
  ]);
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

  const { controller, action, plugin: pathPlugin } = isResolvablePath(
    resolverOf
  )
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
  generateSchema,
  getDescription,
  formatGQL,
  buildQuery,
  buildMutation,
};
