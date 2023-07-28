module.exports = ({ env }) => ({
  // autoOpen: false,
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'example-token'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'example-salt'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'example-salt'),
    },
  },
});
