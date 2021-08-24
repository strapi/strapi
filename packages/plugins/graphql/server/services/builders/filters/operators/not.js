'use strict';

const NOT_FIELD_NAME = 'not';

module.exports = ({ strapi }) => ({
  fieldName: NOT_FIELD_NAME,

  strapiOperator: '$not',

  add(t, type) {
    const { naming, attributes } = strapi.plugin('graphql').service('utils');

    if (attributes.isGraphQLScalar({ type })) {
      t.field(NOT_FIELD_NAME, { type: naming.getScalarFilterInputTypeName(type) });
    } else {
      t.field(NOT_FIELD_NAME, { type });
    }
  },
});
