'use strict';

const _ = require('lodash');

module.exports = {
  models: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;

    ctx.send({ models: Service.getModels() });
  }
};
