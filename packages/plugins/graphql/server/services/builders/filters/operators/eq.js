'use strict';

const EQ_FIELD_NAME = 'eq';

module.exports = ({ strapi }) => ({
  fieldName: EQ_FIELD_NAME,

  strapiOperator: '$eq',

  add(t, type) {
    const { GRAPHQL_SCALARS } = strapi.plugin('graphql').service('constants');

    if (!GRAPHQL_SCALARS.includes(type)) {
      throw new Error(`Can't use "${EQ_FIELD_NAME}" operator. "${type}" is not a valid scalar`);
    }

    t.field(EQ_FIELD_NAME, { type });
  },
});
