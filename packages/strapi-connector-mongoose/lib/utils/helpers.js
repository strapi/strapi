'use strict';

const findComponentByGlobalId = globalId => {
  return Object.values(strapi.components).find(
    compo => compo.globalId === globalId
  );
};

module.exports = {
  findComponentByGlobalId,
};
