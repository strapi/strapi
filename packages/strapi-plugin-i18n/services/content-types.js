'use strict';

const { prop } = require('lodash/fp');
const { isRelationalAttribute } = require('strapi-utils').contentTypes;

const isLocalized = modelOrAttribute => {
  return prop('pluginOptions.i18n.localized', modelOrAttribute) === true;
};

const getNonLocalizedFields = model => {
  return Object.keys(model.attributes).filter(attributeName => {
    const attribute = model.attributes[attributeName];
    return !isLocalized(attribute) && !isRelationalAttribute(attribute);
  });
};

module.exports = {
  isLocalized,
  getNonLocalizedFields,
};
