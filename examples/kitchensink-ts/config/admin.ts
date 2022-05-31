export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'f60310f1375f857da044d2f4b49a2431'),
  },
});
