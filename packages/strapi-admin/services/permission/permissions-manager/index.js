'use strict';

const _ = require('lodash');
const { subject: asSubject } = require('@casl/ability');
const { permittedFieldsOf } = require('@casl/ability/extra');
const { sanitizeEntity } = require('strapi-utils');
const { buildStrapiQuery, buildCaslQuery } = require('./query-builers');

module.exports = (ability, action, model) => ({
  ability,
  action,
  model,

  get query() {
    return buildStrapiQuery(buildCaslQuery(ability, action, model));
  },

  get isAllowed() {
    return this.ability.can(action, model);
  },

  toSubject(target, subjectType = model) {
    return asSubject(subjectType, target);
  },

  pickPermittedFieldsOf(data, options = {}) {
    return this.sanitize(data, { ...options, isOutput: false });
  },

  queryFrom(query) {
    return {
      ...query,
      _where: query._where ? _.concat(this.query, query._where) : [this.query],
    };
  },

  sanitize(data, options = {}) {
    const {
      subject = this.toSubject(data),
      action: actionOverride = action,
      withPrivate = true,
      isOutput = true,
    } = options;

    if (_.isArray(data)) {
      return data.map(this.sanitize.bind(this));
    }

    const permittedFields = permittedFieldsOf(ability, actionOverride, subject);
    const hasAtLeastOneRegisteredField = _.some(
      _.flatMap(ability.rulesFor(actionOverride, subject), 'fields')
    );
    const shouldIncludeAllFields = _.isEmpty(permittedFields) && !hasAtLeastOneRegisteredField;

    return sanitizeEntity(data, {
      model: strapi.getModel(model),
      includeFields: shouldIncludeAllFields ? null : permittedFields,
      withPrivate,
      isOutput,
    });
  },
});
