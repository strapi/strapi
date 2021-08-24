'use strict';

const { inputObjectType, nonNull } = require('nexus');

const { utils, mappers } = require('../types');

const {
  getComponentInputName,
  getContentTypeInputName,
  getEnumName,
  getDynamicZoneInputName,
  isStrapiScalar,
  isRelation,
  isMorphRelation,
  isMedia,
  isEnumeration,
  isComponent,
  isDynamicZone,
} = utils;

module.exports = context => {
  const { strapi } = context;

  return {
    buildInputType(contentType) {
      const { attributes, modelType } = contentType;

      const name = (modelType === 'component'
        ? getComponentInputName
        : getContentTypeInputName
      ).call(null, contentType);

      return inputObjectType({
        name,

        definition(t) {
          for (const [attributeName, attribute] of Object.entries(attributes)) {
            // Scalars
            if (isStrapiScalar(attribute)) {
              const gqlScalar = mappers.strapiScalarToGraphQLScalar(attribute.type);

              t.field(attributeName, { type: gqlScalar });
            }

            // Media
            else if (isMedia(attribute)) {
              const isMultiple = attribute.multiple === true;

              isMultiple ? t.list.id(attributeName) : t.id(attributeName);
            }

            // Regular Relations (ignore polymorphic relations)
            else if (isRelation(attribute) && !isMorphRelation(attribute)) {
              const isToManyRelation = attribute.relation.endsWith('Many');

              isToManyRelation ? t.list.id(attributeName) : t.id(attributeName);
            }

            // Enums
            else if (isEnumeration(attribute)) {
              const enumTypeName = getEnumName(contentType, attributeName);

              t.field(attributeName, { type: enumTypeName });
            }

            // Components
            else if (isComponent(attribute)) {
              const isRepeatable = attribute.repeatable === true;
              const component = strapi.components[attribute.component];
              const componentInputType = getComponentInputName(component);

              if (isRepeatable) {
                t.list.field(attributeName, { type: componentInputType });
              } else {
                t.field(attributeName, { type: componentInputType });
              }
            }

            // Dynamic Zones
            else if (isDynamicZone(attribute)) {
              const dzInputName = getDynamicZoneInputName(contentType, attributeName);

              t.list.field(attributeName, { type: nonNull(dzInputName) });
            }
          }
        },
      });
    },
  };
};
