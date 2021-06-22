'use strict';

const { isArray } = require('lodash/fp');
const { objectType } = require('nexus');

const { contentTypes } = require('@strapi/utils');

const { mappers, utils: typeUtils } = require('../../types');
// const { buildAssociationResolver } = require('../resolvers');
const { buildAssocResolvers } = require('../../../shadow-crud');

/**
 * Create a type definition for a given content type
 * @param name - The name of the type
 * @param contentType - The content type used to created the definition
 * @return {NexusObjectTypeDef}
 */
const buildTypeDefinition = (name, contentType) => {
  const { attributes, primaryKey, options = {} } = contentType;

  const attributesKey = Object.keys(attributes);

  const hasTimestamps = isArray(options.timestamps);

  return objectType({
    name,

    definition(t) {
      // 1. ID & Primary key
      // Always add the ID as a required attribute
      // Also, add the primary key of the content type as a required ID attribute
      t.nonNull.id('id');
      t.nonNull.id(primaryKey);

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

          let builder = t;

          if (attribute.required) {
            builder = builder.nonNull;
          }

          // Scalars
          if (typeUtils.isScalar(attribute)) {
            addScalarAttribute(builder, attributeName, attribute);
          }

          // Components
          else if (typeUtils.isComponent(attribute)) {
            addComponentAttribute(builder, attributeName, attribute);
          }

          // Dynamic Zones
          else if (typeUtils.isDynamicZone(attribute) && attribute.components.length > 0) {
            addDynamicZoneAttribute(builder, attributeName, attribute, contentType);
          }

          // Enums
          else if (typeUtils.isEnumeration(attribute)) {
            addEnumAttribute(builder, attributeName, attribute, contentType);
          }

          // Relations
          else if (typeUtils.isRelation(attribute)) {
            addRelationalAttribute(builder, attributeName, attribute, contentType);
          }
        });
    },
  });
};

/**
 * Add a scalar attribute to the type definition
 *
 * The attribute is added based on a simple association between a Strapi
 * type and a GraphQL type (the map is defined in `strapiTypeToGraphQLScalar`)
 *
 * @param {ObjectDefinitionBlock} builder - Nexus type builder
 * @param {string} attributeName - The name of the attribute
 * @param {object} attribute - The attribute object
 * @param {string} attribute.type - The Strapi type of the attribute
 */
const addScalarAttribute = (builder, attributeName, attribute) => {
  const gqlType = mappers.strapiTypeToGraphQLScalar[attribute.type];

  builder.field(attributeName, { type: gqlType });
};

/**
 * Add a component attribute to the type definition
 *
 * The attribute is added by fetching the component's type
 * name and using it as the attribute's type
 *
 * @param {ObjectDefinitionBlock} builder - Nexus type builder
 * @param {string} attributeName - The name of the attribute
 * @param {object} attribute - The attribute object
 * @param {string} attribute.component - The UID of the component to use
 * @param {boolean} attribute.repeatable - Whether the component is repeatable or not
 */
const addComponentAttribute = (builder, attributeName, attribute) => {
  const component = strapi.components[attribute.component];

  if (attribute.repeatable) {
    builder = builder.list;
  }

  builder.field(attributeName, { type: component.globalId });
};

/**
 * Add a dynamic zone attribute to the type definition
 *
 * The attribute is added by fetching the dynamic zone's
 * type name and using it as the attribute's type
 *
 * @param {ObjectDefinitionBlock} builder - Nexus type builder
 * @param {string} attributeName - The name of the attribute
 * @param {object} attribute - The attribute object
 * @param {object} contentType - The content type we're building the definition for
 */
const addDynamicZoneAttribute = (builder, attributeName, attribute, contentType) => {
  const type = typeUtils.getDynamicZoneName(contentType, attributeName);

  builder.field(attributeName, { type });
};

/**
 * Add an enum attribute to the type definition
 *
 * The attribute is added by fetching the enum's type
 * name and using it as the attribute's type
 *
 * @param {ObjectDefinitionBlock} builder - Nexus type builder
 * @param {string} attributeName - The name of the attribute
 * @param {object} attribute - The attribute object
 * @param {object} contentType - The content type we're building the definition for
 */
const addEnumAttribute = (builder, attributeName, attribute, contentType) => {
  const type = typeUtils.getEnumName(contentType, attributeName);

  builder.field(attributeName, { type });
};

/**
 * Add a relational attribute to the type definition
 *
 * @param {ObjectDefinitionBlock} builder - Nexus type builder
 * @param {string} attributeName - The name of the attribute
 * @param {object} attribute - The attribute object
 * @param {string} attribute.model - The model on which the relation is made
 * @param {string} attribute.plugin - The plugin of the attribute's model
 * @param {object} contentType - The content type we're building the definition for
 * @param {string[]} contentType.associations - The list of associations defined for the content type
 */
const addRelationalAttribute = (builder, attributeName, attribute, contentType) => {
  const { associations = [] } = contentType;

  const rel = strapi.getModel(attribute.model, attribute.plugin);

  const relationType = associations.find(assoc => assoc.alias === attributeName).nature;
  const type = typeUtils.getTypeName(rel);

  // todo[v4]: directly map collection relations somewhere else
  if (relationType.endsWith('Many')) {
    builder = builder.list;
  }

  builder.field(attributeName, {
    type,
    resolve: buildAssocResolvers(contentType)[attributeName],
    // todo: use new assoc resolver for relations
    // resolve: buildAssociationResolver(contentType.uid, attributeName),
  });
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

module.exports = { buildTypeDefinition };
