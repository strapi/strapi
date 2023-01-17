module.exports = ({ env }) => ({
  // autoOpen: false,
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'example-token'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'example-salt'),
  },
  // Receive populated relations in webhook and db lifecycle payloads
  relations: {
    populate: false,
  },
});
