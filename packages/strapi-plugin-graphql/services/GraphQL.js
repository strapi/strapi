'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */


const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const pluralize = require('pluralize');
const graphql = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const GraphQLJSON = require('graphql-type-json');
const GraphQLDateTime = require('graphql-type-datetime');
const policyUtils = require('strapi-utils').policy;

module.exports = {
  /**
   * Returns all fields of type primitive
   * 
   * @returns {Boolean}
   */
  isPrimitiveType: (_type) => {
    const type = _type.replace('!', '');
    return (
      type === 'Int' ||
      type === 'Float' ||
      type === 'String' ||
      type === 'Boolean' ||
      type === 'DateTime' ||
      type === 'JSON'
    );
  },

  /**
   * Checks if the field is of type enum
   *
   * @returns {Boolean}
   */
  isEnumType: (type) => {
    return type === 'enumeration';
  },

  /**
   * Returns all fields that are not of type array
   *
   * @returns {Boolean}
   *
   * @example
   *
   * isNotOfTypeArray([String])
   * // => false
   * isNotOfTypeArray(String!)
   * // => true
   */
  isNotOfTypeArray: (type) => {
    return !/(\[\w+!?\])/.test(type);
  },

  /**
   * Returns all fields of type Integer or float
   */
  isNumberType: (type) => {
    return type === 'Int' || type === 'Float';
  },

  /**
   * Convert non-primitive type to string (non-primitive types corresponds to a reference to an other model)
   *
   * @returns {String}
   *
   * @example
   *
   * extractType(String!)
   * // => String
   *
   * extractType(user)
   * // => ID
   *
   * extractType(ENUM_TEST_FIELD, enumeration)
   * // => String
   *
   */
  extractType: function (_type, attributeType) {
    return this.isPrimitiveType(_type)
      ? _type.replace('!', '')
      : this.isEnumType(attributeType)
        ? 'String'
        : 'ID';
  },

  /**
   * Returns a list of fields that have type included in fieldTypes.
   */
  getFieldsByTypes: (fields, typeCheck, returnType) => {
    return _.reduce(fields, (acc, fieldType, fieldName) => {
      if (typeCheck(fieldType)) {
        acc[fieldName] = returnType(fieldType, fieldName);
      }
      return acc;
    }, {});
  },

  /**
   * Use the field resolver otherwise fall through the field value
   *
   * @returns {function}
   */
  fieldResolver: (field, key) => {
    return (object) => {
      const resolver = field.resolve || function resolver(obj, options, context) { // eslint-disable-line no-unused-vars
        return obj[key];
      };
      return resolver(object);
    };
  },

  /**
   * Create fields resolvers
   *
   * @return {Object}
   */
  createFieldsResolver: function(fields, resolver, typeCheck) {
    return Object.keys(fields).reduce((acc, fieldKey) => {
      const field = fields[fieldKey];
      // Check if the field is of the correct type
      if (typeCheck(field)) {
        return _.set(acc, fieldKey, (obj, options, context) => {
          return resolver(obj, options, context, this.fieldResolver(field, fieldKey), fieldKey, obj, field);
        });
      }
      return acc;
    }, {});
  },

  /**
   * Build the mongoose aggregator by applying the filters
   */
  getModelAggregator: function (model, filters = {}) {
    const aggregation = model.aggregate();
    if (!_.isEmpty(filters.where)) {
      aggregation.match(filters.where);
    }
    if (filters.limit) {
      aggregation.limit(filters.limit);
    }
    return aggregation;
  },

  /**
   * Create the resolvers for each aggregation field
   *
   * @return {Object}
   *
   * @example
   *
   * const model = // Strapi model
   *
   * const fields = {
   *   username: String,
   *   age: Int,
   * }
   *
   * const typeCheck = (type) => type === 'Int' || type === 'Float',
   *
   * const fieldsResoler = createAggregationFieldsResolver(model, fields, 'sum', typeCheck);
   *
   * // => {
   *   age: function ageResolver() { .... }
   * }
   */
  createAggregationFieldsResolver: function (model, fields, operation, typeCheck) {
    return this.createFieldsResolver(fields, async (obj, options, context, fieldResolver, fieldKey) => { // eslint-disable-line no-unused-vars
      const result = await this.getModelAggregator(model, obj).group({
        _id: null,
        [fieldKey]: { [`$${operation}`]: `$${fieldKey}` }
      });
      return _.get(result, `0.${fieldKey}`);
    }, typeCheck);
  },

  /**
   * Correctly format the data returned by the group by
   */
  preProcessGroupByData: function ({ result, fieldKey, filters, modelName }) {
    const _result = _.toArray(result);
    return _.map(_result, (value) => {
      const params = Object.assign(
        {},
        this.convertToParams(_.omit(filters, 'where')),
        filters.where,
        {
          [fieldKey]: value._id,
        }
      );

      return {
        key: value._id,
        connection: strapi.utils.models.convertParams(modelName, params),
      };
    });
  },

  /**
   * Create the resolvers for each group by field
   * 
   * @return {Object}
   * 
   * @example
   * 
   * const model = // Strapi model
   * const fields = {
   *   username: [UserConnectionUsername],
   *   email: [UserConnectionEmail],
   * }
   * const fieldsResoler = createGroupByFieldsResolver(model, fields);
   * 
   * // => {
   *   username: function usernameResolver() { .... }
   *   email: function emailResolver() { .... }
   * }
   */
  createGroupByFieldsResolver: function (model, fields, name)  {
    return this.createFieldsResolver(fields, async (obj, options, context, fieldResolver, fieldKey) => {
      const result = await this.getModelAggregator(model, obj).group({ 
        _id: `$${fieldKey}`,
      });

      return this.preProcessGroupByData({
        result,
        fieldKey,
        filters: obj,
        modelName: name,
      });
    }, () => true);
  },

  /**
   * This method is the entry point to the GraphQL's Aggregation.
   * It takes as param the model and its fields and it'll create the aggregation types and resolver to it
   * Example:
   *  type User {
   *     username: String,
   *     age: Int,
   *  }
   * 
   * It'll create
   *  type UserConnection {
   *    values: [User],
   *    groupBy: UserGroupBy,
   *    aggreate: UserAggregate
   *  }
   * 
   *  type UserAggregate {
   *     count: Int
   *     sum: UserAggregateSum
   *     avg: UserAggregateAvg
   *  }
   * 
   *  type UserAggregateSum {
   *     age: Float
   *  }
   * 
   *  type UserAggregateAvg {
   *    age: Float
   *  }
   * 
   *  type UserGroupBy {
   *     username: [UserConnectionUsername]
   *     age: [UserConnectionAge]
   *  }
   * 
   *  type UserConnectionUsername {
   *    key: String
   *    connection: UserConnection
   *  }
   * 
   *  type UserConnectionAge {
   *    key: Int
   *    connection: UserConnection
   *  }
   *
   */
  formatModelConnectionsGQL: function(fields, model, name, modelResolver) {
    const { globalId } = model;

    const connectionGlobalId = `${globalId}Connection`;
    const aggregatorFormat = this.formatConnectionAggregator(fields, model, name);
    const groupByFormat = this.formatConnectionGroupBy(fields, model, name);
    const connectionFields = {
      values: `[${globalId}]`,
      groupBy: `${globalId}GroupBy`,
      aggregate: `${globalId}Aggregator`,
    };
    
    let modelConnectionTypes = `type ${connectionGlobalId} {${this.formatGQL(connectionFields)}}\n\n`;
    if (aggregatorFormat) {
      modelConnectionTypes += aggregatorFormat.type;
    }
    modelConnectionTypes += groupByFormat.type;

    return {
      globalId: connectionGlobalId,
      type: modelConnectionTypes,
      query: {
        [`${pluralize.plural(name)}Connection(sort: String, limit: Int, start: Int, where: JSON)`]: connectionGlobalId,
      },
      resolver: {
        Query: {
          [`${pluralize.plural(name)}Connection`]: (obj, options, context) => { // eslint-disable-line no-unused-vars
            const params = Object.assign(
              {},
              this.convertToParams(_.omit(options, 'where')),
              options.where
            );
            return strapi.utils.models.convertParams(name, params);
          }
        },
        [connectionGlobalId]: {
          values: (obj, option, context) => {
            // Object here contains the key/value of the field that has been grouped-by
            // for instance obj = { where: { country: 'USA' } } so the values here needs to be filtered according to the parent value
            return modelResolver(obj, obj, context);
          },
          groupBy: (obj, option, context) => { // eslint-disable-line no-unused-vars
            // There is noting to resolve here, it's the aggregation resolver that will take care of it
            return obj;
          },
          aggregate: (obj, option, context) => { // eslint-disable-line no-unused-vars
            // There is noting to resolve here, it's the aggregation resolver that will take care of it
            return obj;
          },
        },
        ...aggregatorFormat.resolver,
        ...groupByFormat.resolver,
      },
    };
  },

  /**
   * Generate the connection type of each non-array field of the model
   * 
   * @return {String}
   */
  generateConnectionFieldsTypes: function (fields, model) {
    const { globalId, attributes } = model;
    const primitiveFields = this.getFieldsByTypes(
      fields,
      this.isNotOfTypeArray,
      (type, name) => this.extractType(type, (attributes[name] || {}).type),
    );

    const connectionFields = _.mapValues(primitiveFields, (fieldType) => ({
      key: fieldType,
      connection: `${globalId}Connection`,
    }));

    return Object.keys(primitiveFields).map((fieldKey) =>
      `type ${globalId}Connection${_.upperFirst(fieldKey)} {${this.formatGQL(connectionFields[fieldKey])}}`
    ).join('\n\n');
  },

  formatConnectionGroupBy: function(fields, model, name) {
    const { globalId } = model;
    const groupByGlobalId = `${globalId}GroupBy`;

    // Extract all primitive fields and change their types
    const groupByFields = this.getFieldsByTypes(
      fields,
      this.isNotOfTypeArray,
      (fieldType, fieldName) => `[${globalId}Connection${_.upperFirst(fieldName)}]`,
    );

    // Get the generated field types
    let groupByTypes = `type ${groupByGlobalId} {${this.formatGQL(groupByFields)}}\n\n`;
    groupByTypes += this.generateConnectionFieldsTypes(fields, model);

    return {
      globalId: groupByGlobalId,
      type: groupByTypes,
      resolver: {
        [groupByGlobalId]: this.createGroupByFieldsResolver(model, groupByFields, name),
      }
    };
  },

  formatConnectionAggregator: function(fields, model) {
    const { globalId } = model;
    
    // Extract all fields of type Integer and Float and change their type to Float
    const numericFields = this.getFieldsByTypes(fields, this.isNumberType, () => 'Float');

    // Don't create an aggregator field if the model has not number fields
    const aggregatorGlobalId = `${globalId}Aggregator`;
    const initialFields = {
      count: 'Int',
    };

    // Only add the aggregator's operations if there are some numeric fields
    if (!_.isEmpty(numericFields)) {
      ['sum', 'avg', 'min', 'max'].forEach((agg) => {
        initialFields[agg] = `${aggregatorGlobalId}${_.startCase(agg)}`;
      });
    }
  
    const gqlNumberFormat = this.formatGQL(numericFields);
    let aggregatorTypes = `type ${aggregatorGlobalId} {${this.formatGQL(initialFields)}}\n\n`;

    let resolvers = {
      [aggregatorGlobalId]: {
        count: async (obj, options, context) => { // eslint-disable-line no-unused-vars
          // Object here corresponds to the filter that needs to be applied to the aggregation
          const result = await this.getModelAggregator(model, obj).group({ 
            _id: null,
            count: { $sum: 1 }
          });

          return _.get(result, '0.count');
        },
      }
    };

    // Only add the aggregator's operations types and resolver if there are some numeric fields
    if (!_.isEmpty(numericFields)) {
      // Returns the actual object and handle aggregation in the query resolvers
      const defaultAggregatorFunc = (obj, options, context) => { // eslint-disable-line no-unused-vars
        return obj;
      };
      
      aggregatorTypes += `type ${aggregatorGlobalId}Sum {${gqlNumberFormat}}\n\n`;
      aggregatorTypes += `type ${aggregatorGlobalId}Avg {${gqlNumberFormat}}\n\n`;
      aggregatorTypes += `type ${aggregatorGlobalId}Min {${gqlNumberFormat}}\n\n`;
      aggregatorTypes += `type ${aggregatorGlobalId}Max {${gqlNumberFormat}}\n\n`;

      _.merge(resolvers[aggregatorGlobalId], {
        sum: defaultAggregatorFunc,
        avg: defaultAggregatorFunc,
        min: defaultAggregatorFunc,
        max: defaultAggregatorFunc,
      });

      resolvers = {
        ...resolvers,
        [`${aggregatorGlobalId}Sum`]: this.createAggregationFieldsResolver(model, fields, 'sum', this.isNumberType),
        [`${aggregatorGlobalId}Avg`]: this.createAggregationFieldsResolver(model, fields, 'avg', this.isNumberType),
        [`${aggregatorGlobalId}Min`]: this.createAggregationFieldsResolver(model, fields, 'min', this.isNumberType),
        [`${aggregatorGlobalId}Max`]: this.createAggregationFieldsResolver(model, fields, 'max', this.isNumberType)
      };
    }

    return {
      globalId: aggregatorGlobalId,
      type: aggregatorTypes,
      resolver: resolvers,
    };
  },

  /**
   * Receive an Object and return a string which is following the GraphQL specs.
   *
   * @return String
   */

  formatGQL: function (fields, description = {}, model = {}, type = 'field') {
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
          const info = (_.isString(description[attribute]) ? description[attribute] : _.get(description[attribute], 'description')) || _.get(model, `attributes.${attribute}.description`);
          const deprecated = _.get(description[attribute], 'deprecated') || _.get(model, `attributes.${attribute}.deprecated`);

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
    } else if (type === 'query') {
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
  },

  /**
   * Retrieve description from variable and return a string which follow the GraphQL specs.
   *
   * @return String
   */

  getDescription: (description, model = {}) => {
    const format = '"""\n';

    const str = _.get(description, '_description') ||
      _.isString(description) ? description : undefined ||
      _.get(model, 'info.description');

    if (str) {
      return `${format}${str}\n${format}`;
    }

    return '';
  },

  convertToParams: (params) => {
    return Object.keys(params).reduce((acc, current) => {
      return Object.assign(acc, {
        [`_${current}`]: params[current]
      });
    }, {});
  },

  /**
   * Security to avoid infinite limit.
   *
   * @return String
   */

  amountLimiting: (params) => {
    if (params.limit && params.limit < 0) {
      params.limit = 0;
    } else if (params.limit && params.limit > 100) {
      params.limit = 100;
    }

    return params;
  },

  /**
   * Convert Strapi type to GraphQL type.
   * @param {Object} attribute Information about the attribute.
   * @param {Object} attribute.definition Definition of the attribute.
   * @param {String} attribute.modelName Name of the model which owns the attribute.
   * @param {String} attribute.attributeName Name of the attribute.
   * @return String
   */

  convertType: function ({ definition = {}, modelName = '', attributeName = '' }) {
    // Type
    if (definition.type) {
      let type = 'String';

      switch (definition.type) {
        // TODO: Handle fields of type Array, Perhaps default to [Int] or [String] ...
        case 'boolean':
          type = 'Boolean';
          break;
        case 'integer':
          type = 'Int';
          break;
        case 'float':
          type = 'Float';
          break;
        case 'json':
          type = 'JSON';
          break;
        case 'time':
        case 'date':
        case 'datetime':
        case 'timestamp':
          type = 'DateTime';
          break;
        case 'enumeration':
          type = this.convertEnumType(definition, modelName, attributeName);
          break;
      }

      if (definition.required) {
        type += '!';
      }

      return type;
    }

    const ref = definition.model || definition.collection;

    // Association
    if (ref && ref !== '*') {
      // Add bracket or not
      const globalId = definition.plugin ?
        strapi.plugins[definition.plugin].models[ref].globalId:
        strapi.models[ref].globalId;
      const plural = !_.isEmpty(definition.collection);

      if (plural) {
        return `[${globalId}]`;
      }

      return globalId;
    }

    return definition.model ? 'Morph' : '[Morph]';
  },

  /**
   * Convert Strapi enumeration to GraphQL Enum.
   * @param {Object} definition Definition of the attribute.
   * @param {String} model Name of the model which owns the attribute.
   * @param {String} field Name of the attribute.
   * @return String
   */
  
  convertEnumType: (definition, model, field) => definition.enumName ? definition.enumName : `ENUM_${model.toUpperCase()}_${field.toUpperCase()}`,

  /**
   * Execute policies before the specified resolver.
   *
   * @return Promise or Error.
   */

  composeResolver: function (_schema, plugin, name, isSingular) {
    const params = {
      model: name
    };

    const queryOpts = plugin ? { source: plugin } : {}; // eslint-disable-line no-unused-vars

    const model = plugin ?
      strapi.plugins[plugin].models[name]:
      strapi.models[name];

    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager']; // eslint-disable-line no-unused-vars

    // Extract custom resolver or type description.
    const { resolver: handler = {} } = _schema;

    let queryName;

    if (isSingular === 'force') {
      queryName = name;
    } else {
      queryName = isSingular ?
        pluralize.singular(name):
        pluralize.plural(name);
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
        const { handler = resolver } = _.isPlainObject(resolver) ? resolver : {};

        // Retrieve the controller's action to be executed.
        const [ name, action ] = handler.split('.');

        const controller = plugin ?
          _.get(strapi.plugins, `${plugin}.controllers.${_.toLower(name)}.${action}`):
          _.get(strapi.controllers, `${_.toLower(name)}.${action}`);

        if (!controller) {
          return new Error(`Cannot find the controller's action ${name}.${action}`);
        }

        // We're going to return a controller instead.
        isController = true;

        // Push global policy to make sure the permissions will work as expected.
        policiesFn.push(
          policyUtils.globalPolicy(undefined, {
            handler: `${name}.${action}`
          }, undefined, plugin)
        );

        // Return the controller.
        return controller;
      } else if (resolver) {
        // Function.
        return resolver;
      }

      // We're going to return a controller instead.
      isController = true;

      const controllers = plugin ? strapi.plugins[plugin].controllers : strapi.controllers;

      // Try to find the controller that should be related to this model.
      const controller = isSingular ?
        _.get(controllers, `${name}.findOne`):
        _.get(controllers, `${name}.find`);

      if (!controller) {
        return new Error(`Cannot find the controller's action ${name}.${isSingular ? 'findOne' : 'find'}`);
      }

      // Push global policy to make sure the permissions will work as expected.
      // We're trying to detect the controller name.
      policiesFn.push(
        policyUtils.globalPolicy(undefined, {
          handler: `${name}.${isSingular ? 'findOne' : 'find'}`
        }, undefined, plugin)
      );

      // Make the query compatible with our controller by
      // setting in the context the parameters.
      if (isSingular) {
        return async (ctx, next) => {
          ctx.params = {
            ...params,
            [model.primaryKey]: ctx.params.id
          };

          // Return the controller.
          return controller(ctx, next);
        };
      }

      // Plural.
      return async (ctx, next) => {
        const queryOpts = {};
        queryOpts.params = this.amountLimiting(ctx.params);
        // Avoid using ctx.query = ... because it converts the object values to string
        queryOpts.query = Object.assign(
          {},
          this.convertToParams(_.omit(ctx.params, 'where')),
          ctx.params.where
        );

        return controller(Object.assign({}, ctx, queryOpts, { send: ctx.send }), next); // send method doesn't get copied when using object.assign        
      };
    })();

    // The controller hasn't been found.
    if (_.isError(resolver)) {
      return resolver;
    }

    // Force policies of another action on a custom resolver.
    if (_.isString(resolverOf) && !_.isEmpty(resolverOf)) {
      // Retrieve the controller's action to be executed.
      const [ name, action ] = resolverOf.split('.');

      const controller = plugin ?
        _.get(strapi.plugins, `${plugin}.controllers.${_.toLower(name)}.${action}`):
        _.get(strapi.controllers, `${_.toLower(name)}.${action}`);

      if (!controller) {
        return new Error(`Cannot find the controller's action ${name}.${action}`);
      }

      policiesFn[0] = policyUtils.globalPolicy(undefined, {
        handler: `${name}.${action}`
      }, undefined, plugin);
    }

    if (strapi.plugins['users-permissions']) {
      policies.push('plugins.users-permissions.permissions');
    }

    // Populate policies.
    policies.forEach(policy => policyUtils.get(policy, plugin, policiesFn, `GraphQL query "${queryName}"`, name));

    return async (obj, options, context) => {
      // Hack to be able to handle permissions for each query.
      const ctx = Object.assign(_.clone(context), {
        request: Object.assign(_.clone(context.request), {
          graphql: null
        })
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

      // Resolver can be a function. Be also a native resolver or a controller's action.
      if (_.isFunction(resolver)) {
        context.query = this.convertToParams(options);
        context.params = this.amountLimiting(options);

        if (isController) {
          const values = await resolver.call(null, context);

          if (ctx.body) {
            return ctx.body;
          }

          return values && values.toJSON ? values.toJSON() : values;
        }


        return resolver.call(null, obj, options, context);
      }

      // Resolver can be a promise.
      return resolver;
    };
  },

  /**
   * Construct the GraphQL query & definition and apply the right resolvers.
   *
   * @return Object
   */

  shadowCRUD: function (models, plugin) {
    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    const initialState = { definition: '', query: {}, resolver: { Query : {} } };

    if (_.isEmpty(models)) {
      return initialState;
    }

    return models.reduce((acc, name) => {
      const model = plugin ?
        strapi.plugins[plugin].models[name]:
        strapi.models[name];

      // Setup initial state with default attribute that should be displayed
      // but these attributes are not properly defined in the models.
      const initialState = {
        [model.primaryKey]: 'ID!'
      };

      const globalId = model.globalId;
      const _schema = _.cloneDeep(_.get(strapi.plugins, 'graphql.config._schema.graphql', {}));

      if (!acc.resolver[globalId]) {
        acc.resolver[globalId] = {};
      }

      // Add timestamps attributes.
      if (_.get(model, 'options.timestamps') === true) {
        Object.assign(initialState, {
          createdAt: 'DateTime!',
          updatedAt: 'DateTime!'
        });

        Object.assign(acc.resolver[globalId], {
          createdAt: (obj, options, context) => { // eslint-disable-line no-unused-vars
            return obj.createdAt || obj.created_at;
          },
          updatedAt: (obj, options, context) => { // eslint-disable-line no-unused-vars
            return obj.updatedAt || obj.updated_at;
          }
        });
      }

      // Retrieve user customisation.
      const { type = {}, resolver = {} } = _schema;

      // Convert our layer Model to the GraphQL DL.
      const attributes = Object.keys(model.attributes)
        .filter(attribute => model.attributes[attribute].private !== true)
        .reduce((acc, attribute) => {
          // Convert our type to the GraphQL type.
          acc[attribute] = this.convertType({
            definition: model.attributes[attribute],
            modelName: globalId,
            attributeName: attribute,
          });

          return acc;
        }, initialState);

      // Detect enum and generate it for the schema definition
      const enums = Object.keys(model.attributes)
        .filter(attribute => model.attributes[attribute].type === 'enumeration')
        .map((attribute) => {
          const definition = model.attributes[attribute];

          return `enum ${this.convertEnumType(definition, globalId, attribute)} { ${definition.enum.join(' \n ')} }`;
        }).join(' ');

      acc.definition += enums;

      // Add parameters to optimize association query.
      (model.associations || [])
        .filter(association => association.type === 'collection')
        .forEach(association => {
          attributes[`${association.alias}(sort: String, limit: Int, start: Int, where: JSON)`] = attributes[association.alias];

          delete attributes[association.alias];
        });

      acc.definition += `${this.getDescription(type[globalId], model)}type ${globalId} {${this.formatGQL(attributes, type[globalId], model)}}\n\n`;

      // Add definition to the schema but this type won't be "queriable".
      if (type[model.globalId] === false || _.get(type, `${model.globalId}.enabled`) === false) {
        return acc;
      }

      // Build resolvers.
      const queries = {
        singular: _.get(resolver, `Query.${pluralize.singular(name)}`) !== false ? this.composeResolver(
          _schema,
          plugin,
          name,
          true
        ) : null,
        plural: _.get(resolver, `Query.${pluralize.plural(name)}`) !== false ? this.composeResolver(
          _schema,
          plugin,
          name,
          false
        ) : null
      };

      // TODO:
      // - Handle mutations.
      Object.keys(queries).forEach(type => {
        // The query cannot be built.
        if (_.isError(queries[type])) {
          console.error(queries[type]);
          strapi.stop();
        }

        // Only create query if the function is available.
        if (_.isFunction(queries[type])) {
          if (type === 'singular') {
            Object.assign(acc.query, {
              [`${pluralize.singular(name)}(id: ID!)`]: model.globalId
            });
          } else {
            Object.assign(acc.query, {
              [`${pluralize.plural(name)}(sort: String, limit: Int, start: Int, where: JSON)`]: `[${model.globalId}]`
            });
          }

          _.merge(acc.resolver.Query, {
            [type === 'singular' ? pluralize.singular(name) : pluralize.plural(name)]: queries[type]
          });
        }
      });

      // TODO:
      // - Add support for Graphql Aggregation in Bookshelf ORM
      if (model.orm === 'mongoose') {
        // Generation the aggregation for the given model
        const modelAggregator = this.formatModelConnectionsGQL(attributes, model, name, queries.plural);
        if (modelAggregator) {
          acc.definition += modelAggregator.type;
          if (!acc.resolver[modelAggregator.globalId]) {
            acc.resolver[modelAggregator.globalId] = {};
          }

          _.merge(acc.resolver, modelAggregator.resolver);
          _.merge(acc.query, modelAggregator.query);
        }
      }

      // Build associations queries.
      (model.associations || []).forEach(association => {
        switch (association.nature) {
          case 'oneToManyMorph':
            return _.merge(acc.resolver[globalId], {
              [association.alias]: async (obj) => {
                const withRelated = await resolvers.fetch({
                  id: obj[model.primaryKey],
                  model: name
                }, plugin, [association.alias], false);

                const entry = withRelated && withRelated.toJSON ? withRelated.toJSON() : withRelated;

                // Set the _type only when the value is defined
                if (entry[association.alias]) {
                  entry[association.alias]._type = _.upperFirst(association.model);
                }

                return entry[association.alias];
              }
            });
          case 'manyMorphToOne':
          case 'manyMorphToMany':
          case 'manyToManyMorph':
            return _.merge(acc.resolver[globalId], {
              [association.alias]: async (obj, options, context) => { // eslint-disable-line no-unused-vars
                const [ withRelated, withoutRelated ] = await Promise.all([
                  resolvers.fetch({
                    id: obj[model.primaryKey],
                    model: name
                  }, plugin, [association.alias], false),
                  resolvers.fetch({
                    id: obj[model.primaryKey],
                    model: name
                  }, plugin, [])
                ]);

                const entry = withRelated && withRelated.toJSON ? withRelated.toJSON() : withRelated;

                // TODO:
                // - Handle sort, limit and start (lodash or inside the query)
                entry[association.alias].map((entry, index) => {
                  const type = _.get(withoutRelated, `${association.alias}.${index}.kind`) ||
                  _.upperFirst(_.camelCase(_.get(withoutRelated, `${association.alias}.${index}.${association.alias}_type`))) ||
                  _.upperFirst(_.camelCase(association[association.type]));

                  entry._type = type;

                  return entry;
                });

                return entry[association.alias];
              }
            });
          default:
        }

        _.merge(acc.resolver[globalId], {
          [association.alias]: async (obj, options, context) => { // eslint-disable-line no-unused-vars
            // Construct parameters object to retrieve the correct related entries.
            const params = {
              model: association.model || association.collection,
            };

            const queryOpts = {
              source: association.plugin
            };

            if (association.type === 'model') {
              const rel = obj[association.alias];
              params.id = typeof rel === 'object' && 'id' in rel ? rel.id : rel;
            } else {
              // Get refering model.
              const ref = association.plugin ?
                strapi.plugins[association.plugin].models[params.model]:
                strapi.models[params.model];

              // Apply optional arguments to make more precise nested request.
              const convertedParams = strapi.utils.models.convertParams(name, this.convertToParams(this.amountLimiting(options)));
              const where = strapi.utils.models.convertParams(name, options.where || {});

              // Limit, order, etc.
              Object.assign(queryOpts, convertedParams);

              // Skip.
              queryOpts.skip = convertedParams.start;

              switch (association.nature) {
                case 'manyToMany': {
                  if (association.dominant) {
                    const arrayOfIds = (obj[association.alias] || []).map(related => {
                      return related[ref.primaryKey] || related;
                    });

                    // Where.
                    queryOpts.query = strapi.utils.models.convertParams(name, {
                      // Construct the "where" query to only retrieve entries which are
                      // related to this entry.
                      [ref.primaryKey]: arrayOfIds,
                      ...where.where
                    }).where;
                  }
                  break;
                  // falls through
                }
                default:
                  // Where.
                  queryOpts.query = strapi.utils.models.convertParams(name, {
                    // Construct the "where" query to only retrieve entries which are
                    // related to this entry.
                    [association.via]: obj[ref.primaryKey],
                    ...where.where
                  }).where;
              }
            }

            const value = await (association.model ?
              resolvers.fetch(params, association.plugin, []):
              resolvers.fetchAll(params, { ...queryOpts, populate: [] }));

            return value && value.toJSON ? value.toJSON() : value;
          }
        });
      });

      return acc;
    }, initialState);
  },

  /**
   * Generate GraphQL schema.
   *
   * @return Schema
   */

  generateSchema: function () {
    // Generate type definition and query/mutation for models.
    const shadowCRUD = strapi.plugins.graphql.config.shadowCRUD !== false ? (() => {
      // Exclude core models.
      const models = Object.keys(strapi.models).filter(model => model !== 'core_store');

      // Reproduce the same pattern for each plugin.
      return Object.keys(strapi.plugins).reduce((acc, plugin) => {
        const { definition, query, resolver } = this.shadowCRUD(Object.keys(strapi.plugins[plugin].models), plugin);

        // We cannot put this in the merge because it's a string.
        acc.definition += definition || '';

        return _.merge(acc, {
          query,
          resolver
        });
      }, this.shadowCRUD(models));
    })() : { definition: '', query: '', resolver: '' };

    // Extract custom definition, query or resolver.
    const { definition, query, resolver = {} } = strapi.plugins.graphql.config._schema.graphql;

    // Polymorphic.
    const { polymorphicDef, polymorphicResolver } = this.addPolymorphicUnionType(definition, shadowCRUD.definition);

    // Build resolvers.
    const resolvers = _.omitBy(_.merge(shadowCRUD.resolver, resolver, polymorphicResolver), _.isEmpty) || {};

    // Transform object to only contain function.
    Object.keys(resolvers).reduce((acc, type) => {
      return Object.keys(acc[type]).reduce((acc, resolver) => {
        // Disabled this query.
        if (acc[type][resolver] === false) {
          delete acc[type][resolver];

          return acc;
        }

        if (!_.isFunction(acc[type][resolver])) {
          acc[type][resolver] = acc[type][resolver].resolver;
        }

        if (_.isString(acc[type][resolver]) || _.isPlainObject(acc[type][resolver])) {
          const { plugin = '' } = _.isPlainObject(acc[type][resolver]) ? acc[type][resolver] : {};

          acc[type][resolver] = this.composeResolver(
            strapi.plugins.graphql.config._schema.graphql,
            plugin,
            resolver,
            'force' // Avoid singular/pluralize and force query name.
          );
        }

        return acc;
      }, acc);
    }, resolvers);

    // Return empty schema when there is no model.
    if (_.isEmpty(shadowCRUD.definition) && _.isEmpty(definition)) {
      return {};
    }

    // Concatenate.
    const typeDefs = `
      ${definition}
      ${shadowCRUD.definition}
      type Query {${shadowCRUD.query && this.formatGQL(shadowCRUD.query, resolver.Query, null, 'query')}${query}}
      ${this.addCustomScalar(resolvers)}
      ${polymorphicDef}
    `;

    // Build schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Write schema.
    this.writeGenerateSchema(graphql.printSchema(schema));

    return schema;
  },

  /**
   * Add custom scalar type such as JSON.
   *
   * @return void
   */

  addCustomScalar: (resolvers) => {
    Object.assign(resolvers, {
      JSON: GraphQLJSON,
      DateTime: GraphQLDateTime,
    });

    return 'scalar JSON \n scalar DateTime';
  },

  /**
   * Add Union Type that contains the types defined by the user.
   *
   * @return string
   */

  addPolymorphicUnionType: (customDefs, defs) => {
    const types = graphql.parse(customDefs + defs).definitions
      .filter(def => def.kind === 'ObjectTypeDefinition' && def.name.value !== 'Query')
      .map(def => def.name.value);

    if (types.length > 0) {
      return {
        polymorphicDef: `union Morph = ${types.join(' | ')}`,
        polymorphicResolver: {
          Morph: {
            __resolveType(obj, context, info) { // eslint-disable-line no-unused-vars
              return obj.kind || obj._type;
            }
          }
        }
      };
    }

    return {
      polymorphicDef: '',
      polymorphicResolver: {}
    };
  },

  /**
   * Save into a file the readable GraphQL schema.
   *
   * @return void
   */

  writeGenerateSchema(schema) {
    // Disable auto-reload.
    strapi.reload.isWatching = false;

    const generatedFolder = path.resolve(strapi.config.appPath, 'plugins', 'graphql', 'config', 'generated');

    // Create folder if necessary.
    try {
      fs.accessSync(generatedFolder, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        fs.mkdirSync(generatedFolder);
      } else {
        console.error(err);
      }
    }

    fs.writeFileSync(path.join(generatedFolder, 'schema.graphql'), schema);

    strapi.reload.isWatching = true;
  }

};
