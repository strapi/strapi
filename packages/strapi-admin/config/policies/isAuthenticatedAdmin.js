'use strict';

module.exports = (ctx, next) => {
  if (!ctx.state.isAuthenticatedAdmin) {
    throw strapi.errors.forbidden();
  }

  return next();
};
