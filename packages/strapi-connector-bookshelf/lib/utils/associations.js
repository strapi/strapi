'use strict';

const isPolymorphic = ({ assoc }) => {
  return assoc.nature.toLowerCase().indexOf('morph') !== -1;
};

module.exports = {
  isPolymorphic,
};
