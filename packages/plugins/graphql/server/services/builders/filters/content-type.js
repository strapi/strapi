'use strict';

const { builder } = require('../pothosBuilder');

module.exports = ({ strapi }) => {
  const rootLevelOperators = () => {
    const { operators } = strapi.plugin('graphql').service('builders').filters;

    return [operators.and, operators.or, operators.not];
  };

  const addScalarAttribute = (builder, attribute) => {
    const { naming, mappers } = strapi.plugin('graphql').service('utils');

    const gqlType = mappers.strapiScalarToGraphQLScalar(attribute.type);

    return builder.field({ type: naming.getScalarFilterInputTypeName(gqlType) });
  };

  const addRelationalAttribute = (builder, attribute) => {
    const utils = strapi.plugin('graphql').service('utils');
    const extension = strapi.plugin('graphql').service('extension');
    const { getFiltersInputTypeName } = utils.naming;
    const { isMorphRelation } = utils.attributes;

    const model = strapi.getModel(attribute.target);

    // If there is no model corresponding to the attribute configuration
    // or if the attribute is a polymorphic relation, then ignore it
    if (!model || isMorphRelation(attribute)) return;

    // If the target model is disabled, then ignore it too
    if (extension.shadowCRUD(model.uid).isDisabled()) return;

    return builder.field({ type: getFiltersInputTypeName(model) });
  };

  const addComponentAttribute = (builder, attribute) => {
    const utils = strapi.plugin('graphql').service('utils');
    const extension = strapi.plugin('graphql').service('extension');
    const { getFiltersInputTypeName } = utils.naming;

    const component = strapi.getModel(attribute.component);

    // If there is no component corresponding to the attribute configuration, then ignore it
    if (!component) return;

    // If the component is disabled, then ignore it too
    if (extension.shadowCRUD(component.uid).isDisabled()) return;

    return builder.field({ type: getFiltersInputTypeName(component) });
  };

  const buildContentTypeFilters = (contentType) => {
    const utils = strapi.plugin('graphql').service('utils');
    const extension = strapi.plugin('graphql').service('extension');

    const { getFiltersInputTypeName, getScalarFilterInputTypeName } = utils.naming;
    const { isStrapiScalar, isRelation, isComponent } = utils.attributes;

    const { attributes } = contentType;

    const filtersTypeName = getFiltersInputTypeName(contentType);

    return builder.inputType(filtersTypeName, {
      fields(t) {
        const fieldsObj = {};

        const validAttributes = Object.entries(attributes).filter(([attributeName]) =>
          extension.shadowCRUD(contentType.uid).field(attributeName).hasFiltersEnabeld()
        );

        const isIDFilterEnabled = extension
          .shadowCRUD(contentType.uid)
          .field('id')
          .hasFiltersEnabeld();
        // Add an ID filter to the collection types
        if (contentType.kind === 'collectionType' && isIDFilterEnabled) {
          fieldsObj.id = t.field({ type: getScalarFilterInputTypeName('ID') });
        }

        // Add every defined attribute
        for (const [attributeName, attribute] of validAttributes) {
          // Handle scalars
          if (isStrapiScalar(attribute)) {
            fieldsObj[attributeName] = addScalarAttribute(t, attribute);
          }

          // Handle relations
          else if (isRelation(attribute)) {
            const ref = addRelationalAttribute(t, attribute);

            if (ref) fieldsObj[attributeName] = ref;
          }

          // Handle components
          else if (isComponent(attribute)) {
            fieldsObj[attributeName] = addComponentAttribute(t, attribute);
          }
        }

        // Conditional clauses
        for (const operator of rootLevelOperators()) {
          fieldsObj[operator.fieldName] = operator.add(t, filtersTypeName);
        }

        return fieldsObj;
      },
    });
  };

  return {
    buildContentTypeFilters,
  };
};
