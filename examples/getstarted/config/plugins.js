module.exports = ({ env }) => ({
  graphql: {
    amountLimit: 5,
    depthLimit: 10,
  },
  email: {
    provider: 'mailgun',
    providerOptions: {
      apiKey: env('MAILGUN_API_KEY'),
      domain: env('MAILGUN_DOMAIN'),
    },
    settings: {
      defaultFrom: 'strapi@strapi.io',
    },
  },
});
