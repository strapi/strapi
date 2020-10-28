'use strict';

const _ = require('lodash');
const { subject: asSubject } = require('@casl/ability');
const { permittedFieldsOf } = require('@casl/ability/extra');
const {
  sanitizeEntity,
  contentTypes: { constants },
} = require('strapi-utils');
const { buildStrapiQuery, buildCaslQuery } = require('./query-builers');

// Allow refactoring from mutli arg to obj args
const parseArguments = args => {
  if (args.length === 1) {
    return args[0];
  } else {
    return {
      ability: args[0],
      action: args[1],
      model: args[2],
    };
  }
};

module.exports = (...args) => {
  const { ability, action, model } = parseArguments(args);

  return {
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
        return data.map(entity => this.sanitize(entity, { action, withPrivate, isOutput }));
      }

      const permittedFields = permittedFieldsOf(ability, actionOverride, subject);
      const hasAtLeastOneRegisteredField = _.some(
        _.flatMap(ability.rulesFor(actionOverride, subject), 'fields')
      );
      const shouldIncludeAllFields = _.isEmpty(permittedFields) && !hasAtLeastOneRegisteredField;

      const sanitizedEntity = sanitizeEntity(data, {
        model: strapi.getModel(model),
        includeFields: shouldIncludeAllFields ? null : permittedFields,
        withPrivate,
        isOutput,
      });

      return _.omit(sanitizedEntity, [
        `${constants.CREATED_BY_ATTRIBUTE}.roles`,
        `${constants.UPDATED_BY_ATTRIBUTE}.roles`,
      ]);
    },

    permittedFieldsOf(action, subject) {
      const permittedFields = permittedFieldsOf(ability, action, subject);

      const hasAtLeastOneRegisteredField = _.some(
        _.flatMap(ability.rulesFor(action, subject), 'fields')
      );

      const shouldIncludeAllFields = _.isEmpty(permittedFields) && !hasAtLeastOneRegisteredField;
      return shouldIncludeAllFields ? null : permittedFieldsOf;
    },
  };
};
