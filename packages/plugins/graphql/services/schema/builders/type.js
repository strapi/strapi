'use strict';

const { isArray, isString, isUndefined } = require('lodash/fp');
const { objectType } = require('nexus');

const { contentTypes } = require('@strapi/utils');

const { mappers, utils: typeUtils, constants } = require('../../types');
const { buildAssociationResolver, buildComponentResolver } = require('../resolvers');
const { getContentTypeArgs } = require('./utils');

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
        // 1. Timestamps
        // If the content type has timestamps enabled
        // then we should add the corresponding attributes in the definition
        if (hasTimestamps) {
          const [createdAtKey, updatedAtKey] = contentType.options.timestamps;

          t.nonNull.dateTime(createdAtKey);
          t.nonNull.dateTime(updatedAtKey);
        }

        /** 2. Attributes
         *
         * Attributes can be of 7 different kind:
         * - Scalar
         * - Component
         * - Dynamic Zone
         * - Enum
         * - Media
         * - Polymorphic Relations
         * - Regular Relations
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
            if (typeUtils.isStrapiScalar(attribute)) {
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

            // Media
            else if (typeUtils.isMedia(attribute)) {
              addMediaAttribute(options);
            }

            // Polymorphic Relations
            else if (typeUtils.isMorphRelation(attribute)) {
              addPolymorphicRelationalAttribute(options);
            }

            // Regular Relations
            else if (typeUtils.isRelation(attribute) || typeUtils.isMedia(attribute)) {
              addRegularRelationalAttribute(options);
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
const addComponentAttribute = ({ builder, attributeName, contentType, attribute, context }) => {
  const { strapi } = context;

  const type = typeUtils.getComponentNameFromAttribute(attribute);

  if (attribute.repeatable) {
    builder = builder.list;
  }

  const targetComponent = strapi.getModel(attribute.component);

  const resolve = buildComponentResolver({
    contentTypeUID: contentType.uid,
    attributeName,
    strapi,
  });

  const args = getContentTypeArgs(targetComponent);

  builder.field(attributeName, { type, resolve, args });
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
 * Add a media attribute to the type definition
 * @param {TypeBuildersOptions} options
 */
const addMediaAttribute = options => {
  let { builder } = options;
  const {
    attributeName,
    attribute,
    contentType,
    context: { strapi },
  } = options;

  const fileContentType = strapi.getModel('plugins::upload.file');

  const resolve = buildAssociationResolver({
    contentTypeUID: contentType.uid,
    attributeName,
    strapi,
  });

  const args = attribute.multiple ? getContentTypeArgs(fileContentType) : undefined;
  const type = attribute.multiple
    ? typeUtils.getEntityResponseCollectionName(fileContentType)
    : typeUtils.getEntityResponseName(fileContentType);

  builder.field(attributeName, { type, resolve, args });
};

/**
 * Add a polymorphic relational attribute to the type definition
 * @param {TypeBuildersOptions} options
 */
const addPolymorphicRelationalAttribute = options => {
  let { builder } = options;
  const {
    attributeName,
    attribute,
    contentType,
    context: { strapi },
  } = options;

  const { target } = attribute;
  const isToManyRelation = attribute.relation.endsWith('Many');

  if (isToManyRelation) {
    builder = builder.list;
  }
  // todo[v4]: How to handle polymorphic relation w/ entity response collection types?
  //            -> Currently return raw polymorphic entities

  const resolve = buildAssociationResolver({
    contentTypeUID: contentType.uid,
    attributeName,
    strapi,
  });

  // If there is no specific target specified, then use the GenericMorph type
  if (isUndefined(target)) {
    builder.field(attributeName, {
      type: constants.GENERIC_MORPH_TYPENAME,
      resolve,
    });
  }

  // If the target is an array of string, resolve the associated morph type and use it
  else if (isArray(target) && target.every(isString)) {
    const type = typeUtils.getMorphRelationTypeName(contentType, attributeName);

    builder.field(attributeName, { type, resolve });
  }
};

/**
 * Add a regular relational attribute to the type definition
 * @param {TypeBuildersOptions} options
 */
const addRegularRelationalAttribute = options => {
  let { builder } = options;
  const {
    attributeName,
    attribute,
    contentType,
    context: { strapi },
  } = options;

  const isToManyRelation = attribute.relation.endsWith('Many');

  const resolve = buildAssociationResolver({
    contentTypeUID: contentType.uid,
    attributeName,
    strapi,
  });

  const targetContentType = strapi.getModel(attribute.target);

  const type =
    isToManyRelation && targetContentType.kind !== 'singleType'
      ? typeUtils.getEntityResponseCollectionName(targetContentType)
      : typeUtils.getEntityResponseName(targetContentType);

  const args = isToManyRelation ? getContentTypeArgs(targetContentType) : undefined;

  builder.field(attributeName, { type, resolve, args });
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
