'use strict';

const {
  contentTypes: { hasDraftAndPublish },
} = require('@strapi/utils');

module.exports = ({ ctx, strapi }) => {
  const {
    params: { model: modelUid },
  } = ctx;

  const model = strapi.contentTypes[modelUid];

  if (!hasDraftAndPublish(model)) {
    throw strapi.errors.forbidden();
  }

  return true;
};
