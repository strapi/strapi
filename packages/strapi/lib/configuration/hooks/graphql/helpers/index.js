'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const GraphQL = require('graphql');

// Local utilities.
const GraphQLJson = require('../utils/scalars/json');

/**
 * GraphQL helpers
 */

module.exports = {

  /*
   * Convert model type to GraphQL type system
   */

  convertToGraphQLQueryType: function (rules, ctx) {
    if (rules.hasOwnProperty('type')) {
      switch (rules.type.toLowerCase()) {
        case 'string':
          return GraphQL.GraphQLString;
        case 'integer':
          return GraphQL.GraphQLInt;
        case 'boolean':
          return GraphQL.GraphQLBoolean;
        case 'float':
          return GraphQL.GraphQLFloat;
        case 'json':
          return GraphQLJson;
        default:
          return GraphQL.GraphQLString;
      }
    } else if (rules.hasOwnProperty('model')) {
      return ctx.defaults.types[_.capitalize(rules.model)];
    } else if (rules.hasOwnProperty('collection')) {
      return new GraphQL.GraphQLList(ctx.defaults.types[_.capitalize(rules.collection)]);
    } else {
      return GraphQL.GraphQLString;
    }
  },

  /*
   * Convert model type to GraphQL type system for input fields
   */

  convertToGraphQLRelationType: function (rules, PK) {
    if (rules.hasOwnProperty('model')) {
      return this.convertToGraphQLQueryType(PK);
    } else if (rules.hasOwnProperty('collection')) {
      return new GraphQL.GraphQLList(this.convertToGraphQLQueryType(PK));
    } else {
      return this.convertToGraphQLQueryType(rules);
    }
  },

  /*
   * Convert GraphQL argument to Bookshelf filters
   */

  handleFilters: function (filters) {
    if (!_.isEmpty(_.get(filters, 'start'))) {
      // _.set(filters, 'where.start', new Date(filters.start).getTime());
      delete filters.start;
    }

    if (!_.isEmpty(_.get(filters, 'end'))) {
      // _.set(filters, 'where.end', new Date(filters.end).getTime());
      delete filters.end;
    }

    if (_.isNumber(_.get(filters, 'skip'))) {
      _.set(filters, 'offset', filters.skip);
      delete filters.skip;
    }

    if (!_.isEmpty(_.get(filters, 'sort'))) {
      _.set(filters, 'orderBy', filters.sort);
      delete filters.sort;
    }

    return filters;
  },

  /*
   * Get Strapi model name based on the collection identity
   */

  getAssociationsByIdentity: function (collectionIdentity) {
    const model = _.find(strapi.models, {tableName: collectionIdentity});

    return !_.isUndefined(model) && model.hasOwnProperty('associations') ? _.keys(_.groupBy(model.associations, 'alias')) : [];
  }
};
