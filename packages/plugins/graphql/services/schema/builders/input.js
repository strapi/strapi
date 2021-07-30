'use strict';

const { inputObjectType, nonNull } = require('nexus');

const { utils, mappers } = require('../../types');

const {
  getComponentInputName,
  getContentTypeInputName,
  getEnumName,
  getDynamicZoneInputName,
  isScalar,
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
            if (isScalar(attribute)) {
              const gqlScalar = mappers.strapiScalarToGraphQLScalar(attribute.type);

              t.field(attributeName, { type: gqlScalar });
            }

            // Relations
            else if (isRelation(attribute) || isMorphRelation(attribute)) {
              const isMultipleMedia = isMedia(attribute) && attribute.multiple;
              const isToManyRelation = isRelation(attribute) && attribute.relation.endsWith('Many');

              return isMultipleMedia || isToManyRelation
                ? t.list.id(attributeName)
                : t.id(attributeName);
            }

            // Enums
            else if (isEnumeration(attribute)) {
              const enumTypeName = getEnumName(contentType, attributeName);

              t.field(attributeName, { type: enumTypeName });
            }

            // Components
            else if (isComponent(attribute)) {
              const component = strapi.components[attribute.component];
              const componentInputType = getComponentInputName(component);

              if (attribute.repeatable) {
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
