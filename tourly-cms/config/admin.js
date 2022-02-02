module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', '75c24592c4e29a51b13e2e0000ba431f'),
  },
});
