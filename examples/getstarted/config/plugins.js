module.exports = {
  graphql: {
    amountLimit: 5,
    depthLimit: 10,
  },
  email: {
    provider: 'sendmail',
    providerOptions: {
      defaultFrom: 'strapi@strapi.io',
    },
  },
};
