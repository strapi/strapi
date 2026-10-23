'use strict';

// An untyped JS middleware: its config is `unknown`.
module.exports = (config) => async (ctx, next) => {
  ctx.state.legacy = config;
  await next();
};
