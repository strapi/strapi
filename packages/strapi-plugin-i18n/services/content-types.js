'use strict';

const { has, prop, isNil } = require('lodash/fp');
const { cloneDeepWith, pick, pipe } = require('lodash/fp');
const { isRelationalAttribute, getVisibleAttributes } = require('strapi-utils').contentTypes;
const { getService } = require('../utils');

const isLocalized = modelOrAttribute => {
  return prop('pluginOptions.i18n.localized', modelOrAttribute) === true;
};

const getValidLocale = async locale => {
  const localesService = getService('locales');

  if (isNil(locale)) {
    return localesService.getDefaultLocale();
  }

  const foundLocale = await localesService.findByCode(locale);
  if (!foundLocale) {
    throw new Error('Locale not found');
  }

  return locale;
};

const getNewLocalizationsFor = async ({ relatedEntityId, model, locale }) => {
  const { kind } = strapi.getModel(model);
  let relatedEntity;

  if (kind === 'singleType') {
    relatedEntity = await strapi.query(model).findOne({});
    if (!relatedEntity) {
      return [];
    }
  } else {
    if (!relatedEntityId) {
      return [];
    }

    relatedEntity = await strapi.query(model).findOne({ id: relatedEntityId });

    if (!relatedEntity) {
      throw new Error("The related entity doesn't exist");
    }
  }

  if (
    relatedEntity.locale === locale ||
    relatedEntity.localizations.map(prop('locale')).includes(locale)
  ) {
    throw new Error('The entity already exists in this locale');
  }

  return [relatedEntity.id, ...relatedEntity.localizations.map(prop('id'))];
};

/**
 * Returns whether an attribute is localized or not
 * @param {*} attribute
 * @returns
 */
const isLocalizedAttribute = (model, attributeName) => {
  const attribute = model.attributes[attributeName];

  return isLocalized(attribute) || isRelationalAttribute(attribute);
};

/**
 * Returns the list of attribute names that are not localized
 * @param {object} model
 * @returns {string[]}
 */
const getNonLocalizedAttributes = model => {
  return getVisibleAttributes(model).filter(
    attributeName => !isLocalizedAttribute(model, attributeName)
  );
};

const removeIds = cloneDeepWith(value => {
  if (typeof value === 'object' && has('id', value)) {
    delete value.id;
  }
});

/**
 * Returns a copy of an entry picking only its non localized attributes
 * @param {object} model
 * @param {object} entry
 * @returns {object}
 */
const copyNonLocalizedAttributes = (model, entry) => {
  const nonLocalizedAttributes = getNonLocalizedAttributes(model);

  return pipe(pick(nonLocalizedAttributes), removeIds)(entry);
};

module.exports = {
  isLocalized,
  getValidLocale,
  getNewLocalizationsFor,
  getNonLocalizedAttributes,
  copyNonLocalizedAttributes,
};
