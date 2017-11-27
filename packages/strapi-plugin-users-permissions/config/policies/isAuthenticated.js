module.exports = async (ctx, next) => {
  if (!ctx.state.user) {
    throw new Error('Authentication is required.');
  }

  await next();
};
