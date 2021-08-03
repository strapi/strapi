module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    // autoOpen: true,
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'example-token'),
    },
  },
});
