const { requestContext } = require('@strapi/strapi');

module.exports = {
  beforeUpdate() {
    const ctx = requestContext.get();

    console.log('User info in service: ', ctx.state.user);
  },
};
