'use strict';

const { inputObjectType } = require('nexus');

module.exports = ({ strapi }) => {
  const rootLevelOperators = () => {
    const { operators } = strapi.plugin('graphql').service('builders').filters;

    return [operators.and, operators.or, operators.not];
  };

  const buildContentTypeFilters = contentType => {
    const utils = strapi.plugin('graphql').service('utils');
    const extension = strapi.plugin('graphql').service('extension');

    const { getFiltersInputTypeName, getScalarFilterInputTypeName } = utils.naming;
    const { isComponent, isStrapiScalar, isRelation } = utils.attributes;

    const { attributes } = contentType;

    const filtersTypeName = getFiltersInputTypeName(contentType);

    return inputObjectType({
      name: filtersTypeName,

      definition(t) {
        const validAttributes = Object.entries(attributes).filter(([attributeName]) =>
          extension.shadowCRUD(contentType.uid).field(attributeName).hasFiltersEnabeld()
        );

        const isIDFilterEnabled = extension
          .shadowCRUD(contentType.uid)
          .field('id')
          .hasFiltersEnabeld();
        // Add an ID filter to the collection types
        if (contentType.kind === 'collectionType' && isIDFilterEnabled) {
          t.field('id', { type: getScalarFilterInputTypeName('ID') });
        }

        // Add every defined attribute
        for (const [attributeName, attribute] of validAttributes) {
          // Handle scalars
          if (isStrapiScalar(attribute)) {
            addScalarAttribute(t, attributeName, attribute);
          }

          // Handle relations
          else if (isRelation(attribute)) {
            addRelationalAttribute(t, attributeName, attribute);
          }
          // Handle components
          else if (isComponent(attribute)) {
            const componentModel = strapi.getModel(attribute.component);
            const componentAttributes = componentModel.attributes;

            const validComponentAttributes = Object.entries(componentAttributes).filter(
              ([attributeName]) =>
                extension.shadowCRUD(contentType.uid).field(attributeName).hasFiltersEnabeld()
            );

            for (const [componentAttributeName, componentAttribute] of validComponentAttributes) {
              // Handle scalars
              if (isStrapiScalar(componentAttribute)) {
                addComponentScalarAttribute(t, attributeName, componentModel, attribute);
              }
            }
          }
        }

        // Conditional clauses
        for (const operator of rootLevelOperators()) {
          operator.add(t, filtersTypeName);
        }
      },
    });
  };

  const addComponentScalarAttribute = (builder, attributeName, contentType, attribute) => {
    const getGraphQLService = strapi.plugin('graphql').service;
    const { naming } = strapi.plugin('graphql').service('utils');
    const { getContentTypeArgs } = getGraphQLService('builders').utils;
    const { buildComponentResolver } = getGraphQLService('builders').get('content-api');

    const type = naming.getFiltersInputTypeName(contentType);

    if (attribute.repeatable) {
      builder = builder.list;
    }

    const targetComponent = strapi.getModel(attribute.component);

    const resolve = buildComponentResolver({
      contentTypeUID: contentType.uid,
      attributeName,
      strapi,
    });

    const args = getContentTypeArgs(targetComponent, { multiple: !!attribute.repeatable });

    builder.field(attributeName, { type, resolve, args });
  };

  const addScalarAttribute = (builder, attributeName, attribute) => {
    const { naming, mappers } = strapi.plugin('graphql').service('utils');

    const gqlType = mappers.strapiScalarToGraphQLScalar(attribute.type);

    builder.field(attributeName, { type: naming.getScalarFilterInputTypeName(gqlType) });
  };

  const addRelationalAttribute = (builder, attributeName, attribute) => {
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

    builder.field(attributeName, { type: getFiltersInputTypeName(model) });
  };

  return {
    buildContentTypeFilters,
  };
};
