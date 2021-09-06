'use strict';

module.exports = (ctx, next) => {
  if (!ctx.state.isAuthenticatedAdmin) {
    return ctx.unauthorized();
  }

  return next();
};
