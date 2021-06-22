'use strict';

const { extendType } = require('nexus');

const { buildQuery } = require('../../../../resolvers-builder');
const { toSingular } = require('../../../../naming');
const { actionExists } = require('../../../../utils');

const { PublicationStateArg } = require('../args');

const { utils } = require('../../../types');

const buildSingleTypeQueries = contentType => {
  return extendType({
    type: 'Query',

    definition(t) {
      addFindQuery(t, contentType);
    },
  });
};

const addFindQuery = (t, contentType) => {
  const { uid, modelName } = contentType;

  const findQueryName = toSingular(utils.getEntityName(contentType));
  const responseTypeName = utils.getEntityResponseName(contentType);

  const resolverOptions = { resolver: `${uid}.find` };

  if (!actionExists(resolverOptions)) {
    return;
  }

  const resolver = buildQuery(toSingular(modelName), resolverOptions);

  t.field(findQueryName, {
    type: responseTypeName,

    args: {
      publicationState: PublicationStateArg,
    },

    async resolve(...params) {
      const res = await resolver(...params);

      return { data: { id: res.id, attributes: res } };
    },
  });
};

module.exports = { buildSingleTypeQueries };
