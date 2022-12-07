'use strict';

const NOT_FIELD_NAME = 'not';

module.exports = ({ strapi }) => ({
  fieldName: NOT_FIELD_NAME,

  strapiOperator: '$not',

  add(t, type) {
    const { naming, attributes } = strapi.plugin('graphql').service('utils');

    if (attributes.isGraphQLScalar({ type })) {
      return t.field({ type: naming.getScalarFilterInputTypeName(type) });
    }

    return t.field({ type });
  },
});
