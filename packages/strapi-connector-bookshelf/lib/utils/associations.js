'use strict';

const findModelByAssoc = ({ assoc }) => {
  return strapi.db.getModelByAssoc(assoc);
};

const isPolymorphic = ({ assoc }) => {
  return assoc.nature.toLowerCase().indexOf('morph') !== -1;
};

module.exports = {
  findModelByAssoc,
  isPolymorphic,
};
