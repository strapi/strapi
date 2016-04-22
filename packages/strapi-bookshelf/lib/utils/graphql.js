'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Strapi helper for GraphQL.
const helpers = require('strapi/lib/configuration/hooks/graphql/helpers/');
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

  getCollectionIdentity: function (collection) {
    return _.capitalize(collection.forge().tableName);
  },

  /**
   * Fetch one record
   *
   * @return {Object}
   */

  fetch: function (collectionIdentity, collection, criteria) {
    return collection.forge(criteria)
      .fetch({withRelated: helpers.getAssociationsByIdentity(collectionIdentity)})
      .then(function (data) {
        return _.isEmpty(data) ? data : data.toJSON();
      });
  },

  /**
   * Fetch all records
   *
   * @return {Array}
   */

  fetchAll: function (collectionIdentity, collection, criteria) {
    const filters = _.omit(helpers.handleFilters(criteria), function (value) {
      return _.isUndefined(value) || _.isNumber(value) ? _.isNull(value) : _.isEmpty(value);
    });

    return collection.forge()
      .query(filters)
      .fetchAll({withRelated: helpers.getAssociationsByIdentity(collectionIdentity)})
      .then(function (data) {
        return data.toJSON() || data;
      });
  },

  /**
   * Fetch latests records based on criteria
   *
   * @return {Array}
   */

  fetchLatest: function (collectionIdentity, collection, criteria) {
    const filters = _.omit(helpers.handleFilters(criteria), function (value) {
      return _.isUndefined(value) || _.isNumber(value) ? _.isNull(value) : _.isEmpty(value);
    });

    // Handle filters
    filters.orderBy = 'createdAt DESC';
    filters.limit = filters.count;

    delete filters.count;

    return collection.forge(criteria)
      .query(filters)
      .fetchAll({withRelated: helpers.getAssociationsByIdentity(collectionIdentity)})
      .then(function (data) {
        return data.toJSON() || data;
      });
  },

  /**
   * Fetch first records based on criteria
   *
   * @return {Array}
   */

  fetchFirst: function (collectionIdentity, collection, criteria) {
    const filters = _.omit(helpers.handleFilters(criteria), function (value) {
      return _.isUndefined(value) || _.isNumber(value) ? _.isNull(value) : _.isEmpty(value);
    });

    // Handle filters
    filters.orderBy = 'createdAt ASC';
    filters.limit = filters.count;

    delete filters.count;

    return collection.forge(criteria)
      .query(filters)
      .fetchAll({withRelated: helpers.getAssociationsByIdentity(collectionIdentity)})
      .then(function (data) {
        return data.toJSON() || data;
      });
  },

  /**
   * Create record
   *
   * @return {Object}
   */

  create: function (collectionIdentity, rootValue, args) {
    return strapi.services[collectionIdentity.toLowerCase()]
      .add(rootValue.context.request.body)
      .then(function (data) {
        return _.isFunction(_.get(data, 'toJSON')) ? data.toJSON() : data;
      });
  },

  /**
   * Update record
   *
   * @return {Object}
   */

  update: function (collectionIdentity, rootValue, args) {
    _.merge(args, rootValue.context.request.body);

    const PK = utils.getPK(collectionIdentity.toLowerCase(), null, strapi.models);

    return strapi.services[collectionIdentity.toLowerCase()]
      .edit(_.set({}, PK, args[PK]), _.omit(args, PK))
      .then(function (data) {
        return _.isFunction(_.get(data, 'toJSON')) ? data.toJSON() : data;
      });
  },

  /**
   * Delete record
   *
   * @return {Object}
   */

  delete: function (collectionIdentity, rootValue, args) {
    _.merge(args, rootValue.context.request.body);

    return strapi.services[collectionIdentity.toLowerCase()]
      .remove(args)
      .then(function (data) {
        return _.isFunction(_.get(data, 'toJSON')) ? data.toJSON() : data;
      });
  },

  /**
   * Count records
   *
   * @return {Array}
   */

  count: function (collectionIdentity, collection) {
    return collection.forge().count();
  }
};
