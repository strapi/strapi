const { requestContext } = require('@strapi/strapi');

module.exports = {
  beforeCreate() {
    const store = requestContext.getStore();

    console.log('User info in service: ', store.auth);
  },
};
