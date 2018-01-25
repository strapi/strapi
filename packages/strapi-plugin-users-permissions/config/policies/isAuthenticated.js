module.exports = async (ctx, next) => {
  if (!ctx.state.user) {
    return ctx.unauthorized();
  }

  await next();
};
