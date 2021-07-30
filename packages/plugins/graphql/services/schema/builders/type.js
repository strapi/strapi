'use strict';

const { isArray } = require('lodash/fp');
const { objectType } = require('nexus');

const { contentTypes } = require('@strapi/utils');

const { mappers, utils: typeUtils } = require('../../types');
const { buildAssociationResolver } = require('../resolvers');

/**
 * @typedef TypeBuildersOptions
 *
 * @property {ObjectDefinitionBlock} builder
 * @property {string} attributeName
 * @property {object} attribute
 * @property {object} contentType
 * @property {object} context
 * @property {object} context.strapi
 * @property {object} context.registry
 */

module.exports = context => ({
  /**
   * Create a type definition for a given content type
   * @param contentType - The content type used to created the definition
   * @return {NexusObjectTypeDef}
   */
  buildTypeDefinition(contentType) {
    const { attributes, modelType, options = {} } = contentType;

    const attributesKey = Object.keys(attributes);
    const hasTimestamps = isArray(options.timestamps);

    const name = (modelType === 'component'
      ? typeUtils.getComponentName
      : typeUtils.getTypeName
    ).call(null, contentType);

    return objectType({
      name,

      definition(t) {
        // 1. ID
        // Always add the ID as a required attribute
        t.nonNull.id('id');

        // 2. Timestamps
        // If the content type has timestamps enabled
        // then we should add the corresponding attributes in the definition
        if (hasTimestamps) {
          const [createdAtKey, updatedAtKey] = contentType.options.timestamps;

          t.nonNull.dateTime(createdAtKey);
          t.nonNull.dateTime(updatedAtKey);
        }

        /** 3. Attributes
         *
         * Attributes can be of 5 different kind:
         * - Scalar
         * - Component
         * - Dynamic Zone
         * - Enum
         * - Relation
         *
         * Here, we iterate over each non-private attribute
         * and add it to the type definition based on its type
         */
        attributesKey
          // Ignore private attributes
          .filter(isNotPrivate(contentType))
          // Add each attribute to the type definition
          .forEach(attributeName => {
            const attribute = attributes[attributeName];

            // We create a copy of the builder (t) to apply custom
            // rules only on the current attribute (eg: nonNull, list, ...)
            let builder = t;

            if (attribute.required) {
              builder = builder.nonNull;
            }

            /**
             * @type {TypeBuildersOptions}
             */
            const options = { builder, attributeName, attribute, contentType, context };

            // Scalars
            if (typeUtils.isScalar(attribute)) {
              addScalarAttribute(options);
            }

            // Components
            else if (typeUtils.isComponent(attribute)) {
              addComponentAttribute(options);
            }

            // Dynamic Zones
            else if (typeUtils.isDynamicZone(attribute) && attribute.components.length > 0) {
              addDynamicZoneAttribute(options);
            }

            // Enums
            else if (typeUtils.isEnumeration(attribute)) {
              addEnumAttribute(options);
            }

            // Relations
            else if (typeUtils.isRelation(attribute) || typeUtils.isMedia(attribute)) {
              addRelationalAttribute(options);
            }
          });
      },
    });
  },
});

/**
 * Add a scalar attribute to the type definition
 *
 * The attribute is added based on a simple association between a Strapi
 * type and a GraphQL type (the map is defined in `strapiTypeToGraphQLScalar`)
 *
 * @param {TypeBuildersOptions} options
 */
const addScalarAttribute = ({ builder, attributeName, attribute }) => {
  const gqlType = mappers.strapiScalarToGraphQLScalar(attribute.type);

  builder.field(attributeName, { type: gqlType });
};

/**
 * Add a component attribute to the type definition
 *
 * The attribute is added by fetching the component's type
 * name and using it as the attribute's type
 *
 * @param {TypeBuildersOptions} options
 */
const addComponentAttribute = ({ builder, attributeName, attribute }) => {
  const type = typeUtils.getComponentNameFromAttribute(attribute);

  if (attribute.repeatable) {
    builder = builder.list;
  }

  builder.field(attributeName, { type });
};

/**
 * Add a dynamic zone attribute to the type definition
 *
 * The attribute is added by fetching the dynamic zone's
 * type name and using it as the attribute's type
 *
 * @param {TypeBuildersOptions} options
 */
const addDynamicZoneAttribute = ({ builder, attributeName, contentType }) => {
  const type = typeUtils.getDynamicZoneName(contentType, attributeName);

  builder.field(attributeName, { type });
};

/**
 * Add an enum attribute to the type definition
 *
 * The attribute is added by fetching the enum's type
 * name and using it as the attribute's type
 *
 * @param {TypeBuildersOptions} options
 */
const addEnumAttribute = ({ builder, attributeName, contentType }) => {
  const type = typeUtils.getEnumName(contentType, attributeName);

  builder.field(attributeName, { type });
};

/**
 * Add a relational attribute to the type definition
 * @param {TypeBuildersOptions} options
 */
const addRelationalAttribute = options => {
  let { builder } = options;
  const {
    attributeName,
    attribute,
    contentType,
    context: { strapi },
  } = options;

  // todo[V4]: Clean the logic below

  const isMorphLike = typeUtils.isMorphRelation(attribute);
  const isToManyRelation = typeUtils.isRelation(attribute) && attribute.relation.endsWith('Many');

  if (isToManyRelation) {
    builder = builder.list;
  }

  const associationResolver = buildAssociationResolver({
    contentTypeUID: contentType.uid,
    attributeName,
    strapi,
  });

  if (typeUtils.isMedia(attribute)) {
    const fileContentType = strapi.getModel('plugins::upload.file');
    const type = typeUtils.getTypeName(fileContentType);

    builder.field(attributeName, { type, resolve: associationResolver });
  } else if (isMorphLike) {
    const { target } = attribute;

    if (typeof target === 'string') {
      const targetContentType = strapi.getModel(target);
      const type = typeUtils.getTypeName(targetContentType);

      builder.field(attributeName, { type, resolve: associationResolver });
    } else if (Array.isArray(target)) {
      const type = typeUtils.getMorphRelationTypeName(contentType, attributeName);

      builder.field(attributeName, { type, resolve: associationResolver });
    } else if (!target) {
      builder.field(attributeName, { type: 'GenericMorph', resolve: associationResolver });
    }
  } else {
    const targetContentType = strapi.getModel(attribute.target);
    const type = typeUtils.getTypeName(targetContentType);

    builder.field(attributeName, { type, resolve: associationResolver });
  }
};

/**
 * Bind a content type on an attribute privacy checker
 *
 * @param {object} contentType
 * @return {function(string): boolean}
 */
const isNotPrivate = contentType => attributeName => {
  return !contentTypes.isPrivateAttribute(contentType, attributeName);
};
