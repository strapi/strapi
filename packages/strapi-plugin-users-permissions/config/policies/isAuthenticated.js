module.exports = async (ctx, next) => {
  if (!ctx.state.user) {
    throw new Error('Authentication required.');
  }

  await next();
};
