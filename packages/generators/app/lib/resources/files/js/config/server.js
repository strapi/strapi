module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    // TODO: V5, remove this variable
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
