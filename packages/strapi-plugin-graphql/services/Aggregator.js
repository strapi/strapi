/**
 * Aggregator.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const pluralize = require('pluralize');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

const Schema = require('./Schema.js');
const GraphQLQuery = require('./Query.js');
/* eslint-disable no-unused-vars */

/**
 * Returns all fields of type primitive
 *
 * @returns {Boolean}
 */
const isPrimitiveType = _type => {
  const type = _type.replace('!', '');
  return (
    type === 'Int' ||
    type === 'Float' ||
    type === 'String' ||
    type === 'Boolean' ||
    type === 'DateTime' ||
    type === 'JSON'
  );
};

/**
 * Checks if the field is of type enum
 *
 * @returns {Boolean}
 */
const isEnumType = type => {
  return type === 'enumeration';
};

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
const isNotOfTypeArray = type => {
  return !/(\[\w+!?\])/.test(type);
};

/**
 * Returns all fields of type Integer or float
 */
const isNumberType = type => {
  return type === 'Int' || type === 'Float';
};

/**
 * Returns a list of fields that have type included in fieldTypes.
 */
const getFieldsByTypes = (fields, typeCheck, returnType) => {
  return _.reduce(
    fields,
    (acc, fieldType, fieldName) => {
      if (typeCheck(fieldType)) {
        acc[fieldName] = returnType(fieldType, fieldName);
      }
      return acc;
    },
    {}
  );
};

/**
 * Use the field resolver otherwise fall through the field value
 *
 * @returns {function}
 */
const fieldResolver = (field, key) => {
  return object => {
    const resolver =
      field.resolve ||
      function resolver(obj, options, context) {
        // eslint-disable-line no-unused-vars
        return obj[key];
      };
    return resolver(object);
  };
};

/**
 * Create fields resolvers
 *
 * @return {Object}
 */
const createFieldsResolver = function(fields, resolverFn, typeCheck) {
  const resolver = Object.keys(fields).reduce((acc, fieldKey) => {
    const field = fields[fieldKey];
    // Check if the field is of the correct type
    if (typeCheck(field)) {
      return _.set(acc, fieldKey, (obj, options, context) => {
        return resolverFn(
          obj,
          options,
          context,
          fieldResolver(field, fieldKey),
          fieldKey,
          obj,
          field
        );
      });
    }
    return acc;
  }, {});

  return resolver;
};

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
const extractType = function(_type, attributeType) {
  return isPrimitiveType(_type)
    ? _type.replace('!', '')
    : isEnumType(attributeType)
      ? 'String'
      : 'ID';
};

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
const createAggregationFieldsResolver = function(model, fields, operation, typeCheck) {
  return createFieldsResolver(
    fields,
    async (filters, options, context, fieldResolver, fieldKey) => {
      // eslint-disable-line no-unused-vars
      return buildQuery({ model, filters, aggregate: true })
        .group({
          _id: null,
          [fieldKey]: { [`$${operation}`]: `$${fieldKey}` },
        })
        .exec()
        .then(result => _.get(result, [0, fieldKey]));
    },
    typeCheck
  );
};

/**
 * Correctly format the data returned by the group by
 */
const preProcessGroupByData = function({ result, fieldKey, filters, model }) {
  const _result = _.toArray(result);
  return _.map(_result, value => {
    return {
      key: value._id,
      connection: () => filters,
    };
  });
};

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
const createGroupByFieldsResolver = function(model, fields, name) {
  const resolver = async (filters, options, context, fieldResolver, fieldKey) => {
    const params = {
      ...GraphQLQuery.convertToParams(_.omit(filters, 'where')),
      ...GraphQLQuery.convertToQuery(filters.where),
    };

    const result = await buildQuery({
      model,
      filters: convertRestQueryParams(params),
      aggregate: true,
    }).group({
      _id: `$${fieldKey}`,
    });

    return preProcessGroupByData({
      result,
      fieldKey,
      filters,
      model,
    });
  };

  return createFieldsResolver(fields, resolver, () => true);
};
/**
 * Generate the connection type of each non-array field of the model
 *
 * @return {String}
 */
const generateConnectionFieldsTypes = function(fields, model) {
  const { globalId, attributes } = model;
  const primitiveFields = getFieldsByTypes(fields, isNotOfTypeArray, (type, name) =>
    extractType(type, (attributes[name] || {}).type)
  );

  const connectionFields = _.mapValues(primitiveFields, fieldType => ({
    key: fieldType,
    connection: `${globalId}Connection`,
  }));

  return Object.keys(primitiveFields)
    .map(
      fieldKey =>
        `type ${globalId}Connection${_.upperFirst(fieldKey)} {${Schema.formatGQL(
          connectionFields[fieldKey]
        )}}`
    )
    .join('\n\n');
};

const formatConnectionGroupBy = function(fields, model, name) {
  const { globalId } = model;
  const groupByGlobalId = `${globalId}GroupBy`;

  // Extract all primitive fields and change their types
  const groupByFields = getFieldsByTypes(
    fields,
    isNotOfTypeArray,
    (fieldType, fieldName) => `[${globalId}Connection${_.upperFirst(fieldName)}]`
  );

  // Get the generated field types
  let groupByTypes = `type ${groupByGlobalId} {${Schema.formatGQL(groupByFields)}}\n\n`;
  groupByTypes += generateConnectionFieldsTypes(fields, model);

  return {
    globalId: groupByGlobalId,
    type: groupByTypes,
    resolver: {
      [groupByGlobalId]: createGroupByFieldsResolver(model, groupByFields, name),
    },
  };
};

const formatConnectionAggregator = function(fields, model) {
  const { globalId } = model;

  // Extract all fields of type Integer and Float and change their type to Float
  const numericFields = getFieldsByTypes(fields, isNumberType, () => 'Float');

  // Don't create an aggregator field if the model has not number fields
  const aggregatorGlobalId = `${globalId}Aggregator`;
  const initialFields = {
    count: 'Int',
    totalCount: 'Int',
  };

  // Only add the aggregator's operations if there are some numeric fields
  if (!_.isEmpty(numericFields)) {
    ['sum', 'avg', 'min', 'max'].forEach(agg => {
      initialFields[agg] = `${aggregatorGlobalId}${_.startCase(agg)}`;
    });
  }

  const gqlNumberFormat = Schema.formatGQL(numericFields);
  let aggregatorTypes = `type ${aggregatorGlobalId} {${Schema.formatGQL(initialFields)}}\n\n`;

  let resolvers = {
    [aggregatorGlobalId]: {
      count: async (obj, options, context) => {
        return buildQuery({
          model,
          filters: {
            limit: obj.limit,
            where: obj.where,
          },
        }).count();
      },
      totalCount: async (obj, options, context) => {
        return buildQuery({
          model,
          filters: {
            where: obj.where,
          },
        }).count();
      },
    },
  };

  // Only add the aggregator's operations types and resolver if there are some numeric fields
  if (!_.isEmpty(numericFields)) {
    // Returns the actual object and handle aggregation in the query resolvers
    const defaultAggregatorFunc = (obj, options, context) => {
      // eslint-disable-line no-unused-vars
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
      [`${aggregatorGlobalId}Sum`]: createAggregationFieldsResolver(
        model,
        fields,
        'sum',
        isNumberType
      ),
      [`${aggregatorGlobalId}Avg`]: createAggregationFieldsResolver(
        model,
        fields,
        'avg',
        isNumberType
      ),
      [`${aggregatorGlobalId}Min`]: createAggregationFieldsResolver(
        model,
        fields,
        'min',
        isNumberType
      ),
      [`${aggregatorGlobalId}Max`]: createAggregationFieldsResolver(
        model,
        fields,
        'max',
        isNumberType
      ),
    };
  }

  return {
    globalId: aggregatorGlobalId,
    type: aggregatorTypes,
    resolver: resolvers,
  };
};

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
const formatModelConnectionsGQL = function(fields, model, name, modelResolver) {
  const { globalId } = model;

  const connectionGlobalId = `${globalId}Connection`;
  const aggregatorFormat = formatConnectionAggregator(fields, model, name);
  const groupByFormat = formatConnectionGroupBy(fields, model, name);
  const connectionFields = {
    values: `[${globalId}]`,
    groupBy: `${globalId}GroupBy`,
    aggregate: `${globalId}Aggregator`,
  };
  const pluralName = pluralize.plural(name);

  let modelConnectionTypes = `type ${connectionGlobalId} {${Schema.formatGQL(
    connectionFields
  )}}\n\n`;
  if (aggregatorFormat) {
    modelConnectionTypes += aggregatorFormat.type;
  }
  modelConnectionTypes += groupByFormat.type;

  const queryName = `${pluralName}Connection(sort: String, limit: Int, start: Int, where: JSON)`;

  return {
    globalId: connectionGlobalId,
    type: modelConnectionTypes,
    query: {
      [queryName]: connectionGlobalId,
    },
    resolver: {
      Query: {
        [`${pluralName}Connection`](obj, options, context) {
          return options;
        },
      },
      [connectionGlobalId]: {
        values(obj, options, context) {
          return modelResolver(obj, obj, context);
        },
        groupBy(obj, options, context) {
          return obj;
        },
        aggregate(obj, options, context) {
          const params = {
            ...GraphQLQuery.convertToParams(_.omit(obj, 'where')),
            ...GraphQLQuery.convertToQuery(obj.where),
          };

          return convertRestQueryParams(params);
        },
      },
      ...aggregatorFormat.resolver,
      ...groupByFormat.resolver,
    },
  };
};

module.exports = {
  formatModelConnectionsGQL,
};
