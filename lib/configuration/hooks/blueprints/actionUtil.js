'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

module.exports = {

  /**
   * Populate the query according to the specified or default
   * association attributes.
   *
   * @param {Object} query
   * @param {Object} _ctx
   * @param {Object} model
   *
   * @return {Object} populated query
   */

  populateEach: function (query, _ctx, model) {
    let shouldPopulate = strapi.config.blueprints.populate;
    let aliasFilter = (_ctx.request.query && _ctx.request.query.populate) || (_ctx.request.body && _ctx.request.body.populate);

    // Convert the string representation of the filter list to an array. We
    // need this to provide flexibility in the request param. This way both
    // list string representations are supported:
    //   /model?populate=alias1,alias2,alias3
    //   /model?populate=[alias1,alias2,alias3]
    if (typeof aliasFilter === 'string') {
      aliasFilter = aliasFilter.replace(/\[|\]/g, '');
      aliasFilter = (aliasFilter) ? aliasFilter.split(',') : [];
    }

    return _(model.associations).reduce(function populateEachAssociation(query, association) {

      // If an alias filter was provided, override the blueprint config.
      if (aliasFilter) {
        shouldPopulate = _.contains(aliasFilter, association.alias);
      }

      // Populate associations and set the according limit.
      if (shouldPopulate) {
        return query.populate(association.alias, {
          limit: strapi.config.blueprints.defaultLimit || 30
        });
      } else {
        return query;
      }
    }, query);
  },

  /**
   * Parse the model to use
   *
   * @param  {_ctx} _ctx
   *
   * @return {WLCollection}
   */

  parseModel: function (_ctx) {

    // Determine the model according to the context.
    const model = _ctx.model || _ctx.params.model;

    if (!model) {
      throw new Error({
        message: 'Please provide a valid model.'
      });
    }

    // Select the Waterline model.
    const Model = strapi.orm.collections[model];
    if (!Model) {
      throw new Error({
        message: 'Invalid Model.'
      });
    }

    Model.name = model;

    return Model;
  },

  /**
   * Parse `values` for a Waterline `create` or `update` from all
   * request parameters.
   *
   * @param  {Request} _ctx
   *
   * @return {Object}
   */

  parseValues: function (_ctx) {
    const values = _ctx.request.body || _ctx.request.query;

    return values;
  },

  /**
   * Parse `criteria` for a Waterline `find` or `update` from all
   * request parameters.
   *
   * @param  {Request} _ctx
   *
   * @return {Object} the where criteria object
   */

  parseCriteria: function (_ctx) {

    // List of properties to remove.
    const blacklist = ['limit', 'skip', 'sort', 'populate'];

    // Validate blacklist to provide a more helpful error msg.
    if (blacklist && !_.isArray(blacklist)) {
      throw new Error('Invalid `_ctx.options.criteria.blacklist`. Should be an array of strings (parameter names.)');
    }

    // Look for explicitly specified `where` parameter.
    let where = _ctx.request.query.where;

    // If `where` parameter is a string, try to interpret it as JSON.
    if (_.isString(where)) {
      try {
        where = JSON.parse(where);
      } catch (err) {

      }
    }

    // If `where` has not been specified, but other unbound parameter variables
    // are specified, build the `where` option using them.
    if (!where) {

      // Prune params which aren't fit to be used as `where` criteria
      // to build a proper where query.
      where = _ctx.request.body;

      // Omit built-in runtime config (like query modifiers).
      where = _.omit(where, blacklist || ['limit', 'skip', 'sort']);

      // Omit any params with undefined values.
      where = _.omit(where, function (p) {
        if (_.isUndefined(p)) {
          return true;
        }
      });
    }

    // Merge with `_ctx.options.where` and return.
    where = _.merge({}, where) || undefined;

    return where;
  },

  /**
   * Parse primary key value
   *
   * @param  {Object} _ctx
   *
   * @return {Integer|String} pk
   */

  parsePk: function (_ctx) {
    let pk = (_ctx.request.body && _ctx.request.body.where && _ctx.request.body.where.id) || _ctx.params.id;

    // Exclude criteria on id field.
    pk = _.isPlainObject(pk) ? undefined : pk;
    return pk;
  },

  requirePk: function (_ctx) {
    const pk = module.exports.parsePk(_ctx);

    // Validate the required `id` parameter.
    if (!pk) {
      const err = new Error({
        message: 'No `id` provided'
      });
      _ctx.status = 400;
      throw err;
    }

    return pk;
  },

  /**
   * Parse sort params.
   *
   * @param  {Object} _ctx
   */

  parseSort: function (_ctx) {
    _ctx.options = _ctx.options || {};
    let sort = _ctx.request.query.sort || _ctx.options.sort;
    if (typeof sort === 'undefined') {
      return undefined;
    }
    if (typeof sort === 'string') {
      try {
        sort = JSON.parse(sort);
      } catch (err) {
      }
    }

    return sort;
  },

  /**
   * Parse limit params.
   *
   * @param  {Object} _ctx
   */

  parseLimit: function (_ctx) {
    _ctx.options = _ctx.options || {};
    let limit = Number(_ctx.request.query.limit) || strapi.config.blueprints.defaultLimit || 30;
    if (limit) {
      limit = +limit;
    }
    return limit;
  },

  /**
   * Parse skip params.
   *
   * @param  {Object} _ctx
   */

  parseSkip: function (_ctx) {
    _ctx.options = _ctx.options || {};
    let skip = _ctx.request.query.skip || 0;
    if (skip) {
      skip = +skip;
    }
    return skip;
  }
};
