'use strict';

const isPolymorphic = ({ assoc }) => {
  return assoc.nature.toLowerCase().indexOf('morph') !== -1;
};

const getManyRelations = definition => {
  return definition.associations.filter(({ nature }) => ['manyToMany', 'manyWay'].includes(nature));
};

module.exports = {
  isPolymorphic,
  getManyRelations,
};
