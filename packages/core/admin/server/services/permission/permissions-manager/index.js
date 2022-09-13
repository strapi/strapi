'use strict';

const _ = require('lodash');
const { cloneDeep, isPlainObject } = require('lodash/fp');
const { subject: asSubject } = require('@casl/ability');
const createSanitizeHelpers = require('./sanitize');

const { buildStrapiQuery, buildCaslQuery } = require('./query-builers');

module.exports = ({ ability, action, model }) => ({
  ability,
  action,
  model,

  get isAllowed() {
    return this.ability.can(action, model);
  },

  toSubject(target, subjectType = model) {
    return asSubject(subjectType, target);
  },

  pickPermittedFieldsOf(data, options = {}) {
    return this.sanitizeInput(data, options);
  },

  getQuery(queryAction = action) {
    if (_.isUndefined(queryAction)) {
      throw new Error('Action must be defined to build a permission query');
    }

    return buildStrapiQuery(buildCaslQuery(ability, queryAction, model));
  },

  addPermissionsQueryTo(query = {}, action) {
    const newQuery = cloneDeep(query);
    const permissionQuery = this.getQuery(action);

    newQuery.filters = isPlainObject(query.filters)
      ? { $and: [query.filters, permissionQuery] }
      : permissionQuery;

    return newQuery;
  },

  ...createSanitizeHelpers({ action, ability, model }),
});
