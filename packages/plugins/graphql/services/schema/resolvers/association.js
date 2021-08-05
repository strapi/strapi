'use strict';

const buildAssociationResolver = ({ contentTypeUID, attributeName, strapi }) => {
  const { entityManager } = strapi.db;

  return (parent, args = {}) => {
    // todo[v4]: Should we be able to run policies here too?
    return entityManager.load(contentTypeUID, parent, attributeName, args);
  };
};

module.exports = { buildAssociationResolver };
