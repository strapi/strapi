'use strict';

const { inputObjectType } = require('nexus');

module.exports = ({ strapi }) => {
  const rootLevelOperators = () => {
    const { operators } = strapi.plugin('graphql').service('builders').filters;

    return [operators.and, operators.or, operators.not];
  };

  const buildContentTypeFilters = contentType => {
    const utils = strapi.plugin('graphql').service('utils');

    const { getFiltersInputTypeName } = utils.naming;
    const { isStrapiScalar, isMedia, isRelation } = utils.attributes;

    const { attributes } = contentType;

    const filtersTypeName = getFiltersInputTypeName(contentType);

    return inputObjectType({
      name: filtersTypeName,

      definition(t) {
        // Add every defined attribute
        for (const [attributeName, attribute] of Object.entries(attributes)) {
          // Handle scalars
          if (isStrapiScalar(attribute)) {
            addScalarAttribute(t, attributeName, attribute);
          }

          // Handle relations
          else if (isRelation(attribute) || isMedia(attribute)) {
            addRelationalAttribute(t, attributeName, attribute);
          }
        }

        // Conditional clauses
        for (const operator of rootLevelOperators()) {
          operator.add(t, filtersTypeName);
        }
      },
    });
  };

  const addScalarAttribute = (builder, attributeName, attribute) => {
    const { naming, mappers } = strapi.plugin('graphql').service('utils');

    const gqlType = mappers.strapiScalarToGraphQLScalar(attribute.type);

    builder.field(attributeName, { type: naming.getScalarFilterInputTypeName(gqlType) });
  };

  const addRelationalAttribute = (builder, attributeName, attribute) => {
    const utils = strapi.plugin('graphql').service('utils');

    const { getFiltersInputTypeName } = utils.naming;
    const { isMorphRelation, isMedia } = utils.attributes;

    const model = strapi.getModel(attribute.target);

    // If there is no model corresponding to the attribute configuration
    // or if the attribute is a polymorphic relation or a media, then ignore it
    if (!model || isMorphRelation(attribute) || isMedia(attribute)) return;

    builder.field(attributeName, { type: getFiltersInputTypeName(model) });
  };

  return {
    buildContentTypeFilters,
  };
};
