'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Strapi helper for GraphQL.
const helpers = require('strapi/lib/configuration/hooks/graphql/helpers/'); // eslint-disable-line import/no-unresolved
const utils = require('./');

/**
 * Utils functions for BookShelf
 */

module.exports = {

  /**
   * Get collection identity
   *
   * @return {String}
   */

  getCollectionIdentity: collection => {
    return _.capitalize(collection.forge().tableName);
  },

  /**
   * Fetch one record
   *
   * @return {Object}
   */

  fetch: (collectionIdentity, collection, criteria) => {
    return collection.forge(criteria)
      .fetch({withRelated: helpers.getAssociationsByIdentity(collectionIdentity)})
      .then(data => _.isEmpty(data) ? data : data.toJSON());
  },

  /**
   * Fetch all records
   *
   * @return {Array}
   */

  fetchAll: (collectionIdentity, collection, criteria) => {
    const filters = _.omit(helpers.handleFilters(criteria), value => {
      return _.isUndefined(value) || _.isNumber(value) ? _.isNull(value) : _.isEmpty(value);
    });

    return collection.forge()
      .query(filters)
      .fetchAll({withRelated: helpers.getAssociationsByIdentity(collectionIdentity)})
      .then(data => data.toJSON() || data);
  },

  /**
   * Fetch latests records based on criteria
   *
   * @return {Array}
   */

  fetchLatest: (collectionIdentity, collection, criteria) => {
    const filters = _.omit(helpers.handleFilters(criteria), value => {
      return _.isUndefined(value) || _.isNumber(value) ? _.isNull(value) : _.isEmpty(value);
    });

    // Handle filters
    filters.orderBy = 'createdAt DESC';
    filters.limit = filters.count;

    delete filters.count;

    return collection.forge(criteria)
      .query(filters)
      .fetchAll({withRelated: helpers.getAssociationsByIdentity(collectionIdentity)})
      .then(data => data.toJSON() || data);
  },

  /**
   * Fetch first records based on criteria
   *
   * @return {Array}
   */

  fetchFirst: (collectionIdentity, collection, criteria) => {
    const filters = _.omit(helpers.handleFilters(criteria), value => {
      return _.isUndefined(value) || _.isNumber(value) ? _.isNull(value) : _.isEmpty(value);
    });

    // Handle filters
    filters.orderBy = 'createdAt ASC';
    filters.limit = filters.count;

    delete filters.count;

    return collection.forge(criteria)
      .query(filters)
      .fetchAll({withRelated: helpers.getAssociationsByIdentity(collectionIdentity)})
      .then(data => data.toJSON() || data);
  },

  /**
   * Create record
   *
   * @return {Object}
   */

  create: (collectionIdentity, rootValue) => {
    return strapi.services[collectionIdentity.toLowerCase()]
      .add(rootValue.context.request.body)
      .then(data => _.isFunction(_.get(data, 'toJSON')) ? data.toJSON() : data);
  },

  /**
   * Update record
   *
   * @return {Object}
   */

  update: (collectionIdentity, rootValue, args) => {
    _.merge(args, rootValue.context.request.body);

    const PK = utils.getPK(collectionIdentity.toLowerCase(), null, strapi.models);

    return strapi.services[collectionIdentity.toLowerCase()]
      .edit(_.set({}, PK, args[PK]), _.omit(args, PK))
      .then(data => _.isFunction(_.get(data, 'toJSON')) ? data.toJSON() : data);
  },

  /**
   * Delete record
   *
   * @return {Object}
   */

  delete: (collectionIdentity, rootValue, args) => {
    _.merge(args, rootValue.context.request.body);

    return strapi.services[collectionIdentity.toLowerCase()]
      .remove(args)
      .then(data => _.isFunction(_.get(data, 'toJSON')) ? data.toJSON() : data);
  },

  /**
   * Count records
   *
   * @return {Array}
   */

  count: (collectionIdentity, collection) => collection.forge().count()
};
