module.exports = ({ env }) => ({
  connection: {
    client: 'mysql',
    connection: {
      host: env('DATABASE_HOST', 'tourly-cms.cwrcz73izhml.eu-west-1.rds.amazonaws.com'),
      port: env.int('DATABASE_PORT', 3306),
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'admin'),
      password: env('DATABASE_PASSWORD', 'XqQ2GnRtR79'),
    },
    useNullAsDefault: true,
  },
});
