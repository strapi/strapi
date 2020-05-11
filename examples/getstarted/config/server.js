module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    jwt: {
      secret: env('ADMIN_JWT_SECRET', 'cdd07276439366dcc133324e14a1d6cb'),
    },
  },
});
