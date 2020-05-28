'use strict';

const findModelByAssoc = ({ assoc }) => {
  const target = assoc.collection || assoc.model;
  return strapi.db.getModel(target, assoc.plugin);
};

const isPolymorphic = ({ assoc }) => {
  return assoc.nature.toLowerCase().indexOf('morph') !== -1;
};

module.exports = {
  findModelByAssoc,
  isPolymorphic,
};
