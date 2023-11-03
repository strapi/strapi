'use strict';

const { merge, isEmpty, set, propEq } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');

const { hasDraftAndPublish, isVisibleAttribute } = strapiUtils.contentTypes;
const { isAnyToMany } = strapiUtils.relations;
const { PUBLISHED_AT_ATTRIBUTE } = strapiUtils.contentTypes.constants;

const isMorphToRelation = (attribute) =>
  isRelation(attribute) && attribute.relation.includes('morphTo');
const isMedia = propEq('type', 'media');
const isRelation = propEq('type', 'relation');
const isComponent = propEq('type', 'component');
const isDynamicZone = propEq('type', 'dynamiczone');

/**
 * Populate the model for relation
 * @param {Object} attribute - Attribute containing a relation
 * @param {String} attribute.relation - type of relation
 * @param model - Model of the populated entity
 * @param attributeName
 * @param {Object} options - Options to apply while populating
 * @param {Boolean} options.countMany
 * @param {Boolean} options.countOne
 * @returns {true|{count: true}}
 */
function getPopulateForRelation(
  attribute,
  model,
  attributeName,
  { countMany, countOne, initialPopulate }
) {
  const isManyRelation = isAnyToMany(attribute);

  if (initialPopulate) {
    return initialPopulate;
  }

  // always populate createdBy, updatedBy, localizations etc.
  if (!isVisibleAttribute(model, attributeName)) {
    return true;
  }

  if ((isManyRelation && countMany) || (!isManyRelation && countOne)) {
    return { count: true };
  }

  return true;
}

/**
 * Populate the model for Dynamic Zone components
 * @param {Object} attribute - Attribute containing the components
 * @param {String[]} attribute.components - IDs of components
 * @param {Object} options - Options to apply while populating
 * @param {Boolean} options.countMany
 * @param {Boolean} options.countOne
 * @param {Number} options.maxLevel
 * @param {Number} level
 * @returns {{populate: Object}}
 */
function getPopulateForDZ(attribute, options, level) {
  // Use fragments to populate the dynamic zone components
  const populatedComponents = (attribute.components || []).reduce(
    (acc, componentUID) => ({
      ...acc,
      [componentUID]: {
        populate: getDeepPopulate(componentUID, options, level + 1),
      },
    }),
    {}
  );

  return { on: populatedComponents };
}

/**
 * Get the populated value based on the type of the attribute
 * @param {String} attributeName - Name of the attribute
 * @param {Object} model - Model of the populated entity
 * @param {Object} model.attributes
 * @param {Object} options - Options to apply while populating
 * @param {Boolean} options.countMany
 * @param {Boolean} options.countOne
 * @param {Number} options.maxLevel
 * @param {Number} level
 * @returns {Object}
 */
function getPopulateFor(attributeName, model, options, level) {
  const attribute = model.attributes[attributeName];

  switch (attribute.type) {
    case 'relation':
      return {
        [attributeName]: getPopulateForRelation(attribute, model, attributeName, options),
      };
    case 'component':
      return {
        [attributeName]: {
          populate: getDeepPopulate(attribute.component, options, level + 1),
        },
      };
    case 'media':
      return {
        [attributeName]: { populate: 'folder' },
      };
    case 'dynamiczone':
      return {
        [attributeName]: getPopulateForDZ(attribute, options, level),
      };
    default:
      return {};
  }
}

/**
 * Deeply populate a model based on UID
 * @param {String} uid - Unique identifier of the model
 * @param {Object} [options] - Options to apply while populating
 * @param {Boolean} [options.countMany=false]
 * @param {Boolean} [options.countOne=false]
 * @param {Number} [options.maxLevel=Infinity]
 * @param {Number} [level=1] - Current level of nested call
 * @returns {Object}
 */
const getDeepPopulate = (
  uid,
  { initialPopulate = {}, countMany = false, countOne = false, maxLevel = Infinity } = {},
  level = 1
) => {
  if (level > maxLevel) {
    return {};
  }

  const model = strapi.getModel(uid);

  return Object.keys(model.attributes).reduce(
    (populateAcc, attributeName) =>
      merge(
        populateAcc,
        getPopulateFor(
          attributeName,
          model,
          { initialPopulate: initialPopulate?.[attributeName], countMany, countOne, maxLevel },
          level
        )
      ),
    {}
  );
};

/**
 * getDeepPopulateDraftCount works recursively on the attributes of a model
 * creating a populated object to count all the unpublished relations within the model
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

/**
 *  Create a Strapi populate object which populates all attribute fields of a Strapi query.
 *
 * @param {string} uid
 * @param {Object} query
 * @returns {Object} populate object
 */
const getQueryPopulate = async (uid, query) => {
  let populateQuery = {};

  await strapiUtils.traverse.traverseQueryFilters(
    /**
     *
     * @param {Object} param0
     * @param {string} param0.key - Attribute name
     * @param {Object} param0.attribute - Attribute definition
     * @param {string} param0.path - Content Type path to the attribute
     * @returns
     */
    ({ attribute, path }) => {
      // TODO: handle dynamic zones and morph relations
      if (!attribute || isDynamicZone(attribute) || isMorphToRelation(attribute)) {
        return;
      }

      // Populate all relations, components and media
      if (isRelation(attribute) || isMedia(attribute) || isComponent(attribute)) {
        const populatePath = path.attribute.replace(/\./g, '.populate.');
        populateQuery = set(populatePath, {}, populateQuery);
      }
    },
    { schema: strapi.getModel(uid) },
    query
  );

  return populateQuery;
};

/**
 * When config admin.webhooks.populateRelations is set to true,
 * populated relations will be passed to any webhook event.
 * The entity-manager response will not have the populated relations though.
 * For performance reasons, it is recommended to set it to false,
 *
 * See docs: https://docs.strapi.io/dev-docs/configurations/server
 *
 * TODO V5: Set to false by default.
 * TODO V5: Make webhooks always send the same entity data.
 */
const isWebhooksPopulateRelationsEnabled = () => {
  return strapi.config.get('server.webhooks.populateRelations', true);
};

module.exports = {
  getDeepPopulate,
  getDeepPopulateDraftCount,
  getQueryPopulate,
  isWebhooksPopulateRelationsEnabled,
};
