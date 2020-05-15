module.exports = {
  graphql: {
    amountLimit: 5,
    depthLimit: 10,
  },
  email: {
    provider: 'sendmail',
    settings: {
      defaultFrom: 'strapi@strapi.io',
    },
  },
};
