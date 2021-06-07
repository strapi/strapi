'use strict';

const { merge, upperFirst } = require('lodash/fp');
const { extendType, nonNull } = require('nexus');

const { toSingular, toPlural } = require('../../../naming');
// const { buildQueryResolver } = require('../resolvers');
const { buildQuery } = require('../../../resolvers-builder');

const buildContentTypesQueries = contentTypes => {
  return contentTypes.map(buildContentTypeQueries).reduce(merge, {});
};

const buildContentTypeQueries = contentType => {
  const { modelName, uid } = contentType;

  const singularName = toSingular(modelName);
  const pluralName = toPlural(modelName);

  const type = upperFirst(singularName);
  const query = `${type}Query`;

  return {
    [query]: extendType({
      type: 'Query',

      definition(t) {
        // Find one query
        t.field(singularName, {
          type,
          args: {},
          description: `Find one ${type}`,
          // resolve: buildQueryResolver(uid, 'findOne'),
          resolve: buildQuery(singularName, { resolver: `${uid}.findOne` }),
        });

        // Find many query
        t.nonNull.list.field(pluralName, {
          type: nonNull(type),
          args: {},
          description: `Find many ${type}`,
          // resolve: buildQueryResolver(uid, 'find'),
          resolve: buildQuery(pluralName, { resolver: `${uid}.find` }),
        });
      },
    }),
  };
};

module.exports = { buildContentTypesQueries };
