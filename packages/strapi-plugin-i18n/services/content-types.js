'use strict';

const { prop, isNil } = require('lodash/fp');
const { isRelationalAttribute } = require('strapi-utils').contentTypes;
const { getService } = require('../utils');

const isLocalized = modelOrAttribute => {
  return prop('pluginOptions.i18n.localized', modelOrAttribute) === true;
};

const getNonLocalizedFields = model => {
  return Object.keys(model.attributes)
    .filter(attributeName => !['locale', 'localizations'].includes(attributeName))
    .filter(attributeName => {
      const attribute = model.attributes[attributeName];
      return !isLocalized(attribute) && !isRelationalAttribute(attribute);
    });
};

const addLocale = async (entity, locale) => {
  const localesService = getService('locales');

  if (isNil(locale)) {
    entity.locale = await localesService.getDefaultLocale();
    return;
  }

  const foundLocale = await localesService.findByCode(locale);
  if (!foundLocale) {
    throw new Error('Locale not found');
  }

  entity.locale = locale;
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

module.exports = {
  isLocalized,
  getNonLocalizedFields,
  addLocale,
  getNewLocalizationsFor,
};
