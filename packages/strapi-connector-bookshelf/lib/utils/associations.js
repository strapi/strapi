'use strict';

const findModelByAssoc = ({ assoc }) => {
  const target = assoc.collection || assoc.model;
  return assoc.plugin === 'admin'
    ? strapi.admin.models[target]
    : assoc.plugin
    ? strapi.plugins[assoc.plugin].models[target]
    : strapi.models[target];
};

const isPolymorphic = ({ assoc }) => {
  return assoc.nature.toLowerCase().indexOf('morph') !== -1;
};

module.exports = {
  findModelByAssoc,
  isPolymorphic,
};
