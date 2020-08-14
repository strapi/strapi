'use strict';

const _ = require('lodash');

module.exports = (ctx, next) => {
  const {
    params: { model: modelUid },
  } = ctx;

  const model = strapi.contentTypes[modelUid];
  const hasDraftAndPublish = _.get(model, 'options.draftAndPublish', false);

  if (!hasDraftAndPublish) {
    throw strapi.errors.forbidden();
  }

  return next();
};
