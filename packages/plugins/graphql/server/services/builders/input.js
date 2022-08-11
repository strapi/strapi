'use strict';

const { inputObjectType, nonNull } = require('nexus');
const {
  contentTypes: { isWritableAttribute },
} = require('@strapi/utils');

module.exports = (context) => {
  const { strapi } = context;

  const { naming, mappers, attributes } = strapi.plugin('graphql').service('utils');
  const extension = strapi.plugin('graphql').service('extension');

  const { getComponentInputName, getContentTypeInputName, getEnumName, getDynamicZoneInputName } =
    naming;

  const {
    isStrapiScalar,
    isRelation,
    isMorphRelation,
    isMedia,
    isEnumeration,
    isComponent,
    isDynamicZone,
  } = attributes;

  return {
    buildInputType(contentType) {
      const { attributes, modelType } = contentType;

      const name = (
        modelType === 'component' ? getComponentInputName : getContentTypeInputName
      ).call(null, contentType);

      return inputObjectType({
        name,

        definition(t) {
          const isFieldEnabled = (fieldName) => {
            return extension.shadowCRUD(contentType.uid).field(fieldName).hasInputEnabled();
          };

          const validAttributes = Object.entries(attributes).filter(([attributeName]) => {
            return isWritableAttribute(contentType, attributeName) && isFieldEnabled(attributeName);
          });

          // Add the ID for the component to enable inplace updates
          if (modelType === 'component' && isFieldEnabled('id')) {
            t.id('id');
          }

          validAttributes.forEach(([attributeName, attribute]) => {
            // Enums
            if (isEnumeration(attribute)) {
              const enumTypeName = getEnumName(contentType, attributeName);

              t.field(attributeName, { type: enumTypeName });
            }

            // Scalars
            else if (isStrapiScalar(attribute)) {
              const gqlScalar = mappers.strapiScalarToGraphQLScalar(attribute.type);

              t.field(attributeName, { type: gqlScalar });
            }

            // Media
            else if (isMedia(attribute)) {
              const isMultiple = attribute.multiple === true;

              if (extension.shadowCRUD('plugin::upload.file').isDisabled()) {
                return;
              }

              if (isMultiple) {
                t.list.id(attributeName);
              } else {
                t.id(attributeName);
              }
            }

            // Regular Relations (ignore polymorphic relations)
            else if (isRelation(attribute) && !isMorphRelation(attribute)) {
              if (extension.shadowCRUD(attribute.target).isDisabled()) {
                return;
              }

              const isToManyRelation = attribute.relation.endsWith('Many');

              if (isToManyRelation) {
                t.list.id(attributeName);
              } else {
                t.id(attributeName);
              }
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
          });
        },
      });
    },
  };
};
