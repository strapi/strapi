'use strict';

const { castArray } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');

const { hasDraftAndPublish, isVisibleAttribute } = strapiUtils.contentTypes;
/**
 * sumDraftCounts works recursively on the attributes of a model counting the
 * number of draft relations
 * These relations can be direct to this content type or contained within components/dynamic zones
 * @param {Object} entity containing the draft relation counts
 * @param {String} uid of the content type
 * @returns {Number} of draft relations
 */
const sumDraftCounts = (entity, uid) => {
  const model = strapi.getModel(uid);

  return Object.keys(model.attributes).reduce((sum, attributeName) => {
    const attribute = model.attributes[attributeName];
    const value = entity[attributeName];
    if (!value) {
      return sum;
    }

    switch (attribute.type) {
      case 'relation': {
        const childModel = strapi.getModel(attribute.target);
        if (hasDraftAndPublish(childModel) && isVisibleAttribute(model, attributeName)) {
          return sum + value.count;
        }
        return sum;
      }
      case 'component': {
        const compoSum = castArray(value).reduce((acc, componentValue) => {
          return acc + sumDraftCounts(componentValue, attribute.component);
        }, 0);
        return sum + compoSum;
      }
      case 'dynamiczone': {
        const dzSum = value.reduce((acc, componentValue) => {
          return acc + sumDraftCounts(componentValue, componentValue.__component);
        }, 0);
        return sum + dzSum;
      }
      default:
        return sum;
    }
  }, 0);
};

module.exports = {
  sumDraftCounts,
};
