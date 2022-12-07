'use strict';

const { merge, isEmpty } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');

const { hasDraftAndPublish, isVisibleAttribute } = strapiUtils.contentTypes;
const { isAnyToMany } = strapiUtils.relations;
const { PUBLISHED_AT_ATTRIBUTE } = strapiUtils.contentTypes.constants;

const getDeepPopulate = (
  uid,
  populate,
  { countMany = false, countOne = false, maxLevel = Infinity } = {},
  level = 1
) => {
  if (populate) {
    return populate;
  }

  if (level > maxLevel) {
    return {};
  }

  const model = strapi.getModel(uid);

  return Object.keys(model.attributes).reduce((populateAcc, attributeName) => {
    const attribute = model.attributes[attributeName];

    if (attribute.type === 'relation') {
      const isManyRelation = isAnyToMany(attribute);
      // always populate createdBy, updatedBy, localizations etc.
      if (!isVisibleAttribute(model, attributeName)) {
        populateAcc[attributeName] = true;
      } else if ((isManyRelation && countMany) || (!isManyRelation && countOne)) {
        populateAcc[attributeName] = { count: true };
      } else {
        populateAcc[attributeName] = true;
      }
    }

    if (attribute.type === 'component') {
      populateAcc[attributeName] = {
        populate: getDeepPopulate(
          attribute.component,
          null,
          { countOne, countMany, maxLevel },
          level + 1
        ),
      };
    }

    if (attribute.type === 'media') {
      populateAcc[attributeName] = { populate: 'folder' };
    }

    if (attribute.type === 'dynamiczone') {
      populateAcc[attributeName] = {
        populate: (attribute.components || []).reduce((acc, componentUID) => {
          return merge(
            acc,
            getDeepPopulate(componentUID, null, { countOne, countMany, maxLevel }, level + 1)
          );
        }, {}),
      };
    }

    return populateAcc;
  }, {});
};

/**
 * getDeepPopulateDraftCount works recursively on the attributes of a model
 * creating a populate object to count all the unpublished relations within the model
 * These relations can be direct to this content type or contained within components/dynamic zones
 * @param {String} uid of the model
 * @returns {Object} result
 * @returns {Object} result.populate
 * @returns {Boolean} result.hasRelations
 */
const getDeepPopulateDraftCount = (uid) => {
  const model = strapi.getModel(uid);
  let hasRelations = false;

  const populate = Object.keys(model.attributes).reduce((populateAcc, attributeName) => {
    const attribute = model.attributes[attributeName];

    switch (attribute.type) {
      case 'relation': {
        const childModel = strapi.getModel(attribute.target);
        if (hasDraftAndPublish(childModel) && isVisibleAttribute(model, attributeName)) {
          populateAcc[attributeName] = {
            count: true,
            filters: { [PUBLISHED_AT_ATTRIBUTE]: { $null: true } },
          };
          hasRelations = true;
        }
        break;
      }
      case 'component': {
        const { populate, hasRelations: childHasRelations } = getDeepPopulateDraftCount(
          attribute.component
        );
        if (childHasRelations) {
          populateAcc[attributeName] = { populate };
          hasRelations = true;
        }
        break;
      }
      case 'dynamiczone': {
        const dzPopulate = (attribute.components || []).reduce((acc, componentUID) => {
          const { populate, hasRelations: childHasRelations } =
            getDeepPopulateDraftCount(componentUID);
          if (childHasRelations) {
            hasRelations = true;
            return merge(acc, populate);
          }
          return acc;
        }, {});

        if (!isEmpty(dzPopulate)) {
          populateAcc[attributeName] = { populate: dzPopulate };
        }
        break;
      }
      default:
    }

    return populateAcc;
  }, {});

  return { populate, hasRelations };
};

module.exports = {
  getDeepPopulate,
  getDeepPopulateDraftCount,
};
