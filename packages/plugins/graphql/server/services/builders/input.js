'use strict';

const {
  contentTypes: { isWritableAttribute },
} = require('@strapi/utils');
const { builder } = require('./pothosBuilder');

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

      return builder.inputType(name, {
        fields(t) {
          const fieldsObj = {};

          const isFieldEnabled = (fieldName) => {
            return extension.shadowCRUD(contentType.uid).field(fieldName).hasInputEnabled();
          };

          const validAttributes = Object.entries(attributes).filter(([attributeName]) => {
            return isWritableAttribute(contentType, attributeName) && isFieldEnabled(attributeName);
          });

          // Add the ID for the component to enable inplace updates
          if (modelType === 'component' && isFieldEnabled('id')) {
            fieldsObj.id = t.id();
          }

          validAttributes.forEach(([attributeName, attribute]) => {
            // Enums
            if (isEnumeration(attribute)) {
              const enumTypeName = getEnumName(contentType, attributeName);

              fieldsObj[attributeName] = t.field({ type: enumTypeName });
            }

            // Scalars
            else if (isStrapiScalar(attribute)) {
              const gqlScalar = mappers.strapiScalarToGraphQLScalar(attribute.type);

              fieldsObj[attributeName] = t.field({ type: gqlScalar });
            }

            // Media
            else if (isMedia(attribute)) {
              const isMultiple = attribute.multiple === true;

              if (extension.shadowCRUD('plugin::upload.file').isDisabled()) {
                return;
              }

              if (isMultiple) {
                fieldsObj[attributeName] = t.idList();
              } else {
                fieldsObj[attributeName] = t.id();
              }
            }

            // Regular Relations (ignore polymorphic relations)
            else if (isRelation(attribute) && !isMorphRelation(attribute)) {
              if (extension.shadowCRUD(attribute.target).isDisabled()) {
                return;
              }

              const isToManyRelation = attribute.relation.endsWith('Many');

              if (isToManyRelation) {
                fieldsObj[attributeName] = t.idList();
              } else {
                fieldsObj[attributeName] = t.id();
              }
            }

            // Components
            else if (isComponent(attribute)) {
              const isRepeatable = attribute.repeatable === true;
              const component = strapi.components[attribute.component];
              const componentInputType = getComponentInputName(component);

              fieldsObj[attributeName] = t.field({
                type: isRepeatable ? [componentInputType] : componentInputType,
              });
            }

            // Dynamic Zones
            else if (isDynamicZone(attribute)) {
              const dzInputName = getDynamicZoneInputName(contentType, attributeName);

              fieldsObj[attributeName] = t.field({ type: [dzInputName], required: true });
            }
          });

          return fieldsObj;
        },
      });
    },
  };
};
