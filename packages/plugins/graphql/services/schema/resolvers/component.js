'use strict';

const { omit } = require('lodash/fp');
const { transformArgs } = require('../builders/utils');

const buildComponentResolver = ({ contentTypeUID, attributeName, strapi }) => {
  return async (source, args = {}) => {
    const contentType = strapi.getModel(contentTypeUID);
    const transformedArgs = transformArgs(args, { contentType, usePagination: true });

    // todo[v4]: move the .load to the entity service?
    const hotFixedArgs = {
      ...omit(['start', 'filters'], transformedArgs),
      where: transformedArgs.filters,
      offset: transformedArgs.start,
    };

    return strapi.db.entityManager.load(contentTypeUID, source, attributeName, hotFixedArgs);
  };
};

module.exports = { buildComponentResolver };
