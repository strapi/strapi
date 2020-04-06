module.exports = ({ env }) => ({
  host: env('HOST', 'localhost'),
  port: env.int('PORT', 1337),
  admin: {
    autoOpen: env.bool('ADMIN_AUTO_OPEN', true),
  },
});
