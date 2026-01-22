module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  const sqlite = {
    client: 'sqlite',
    connection: {
      filename: '.tmp/data.db',
    },
    useNullAsDefault: true,
  };

  const postgres = {
    client: 'postgres',
    connection: {
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', 'strapi'),
      port: env('DATABASE_PORT', 5432),
      host: env('DATABASE_HOST', 'localhost'),
    },
  };

  const mysql = {
    client: 'mysql',
    connection: {
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', 'strapi'),
      port: env('DATABASE_PORT', 3306),
      host: env('DATABASE_HOST', 'localhost'),
    },
  };

  const mariadb = {
    client: 'mysql',
    connection: {
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', 'strapi'),
      port: env('DATABASE_PORT', 3307),
      host: env('DATABASE_HOST', 'localhost'),
    },
  };

  const db = {
    mysql,
    sqlite,
    postgres,
    mariadb,
  };

  return {
    connection: client ? db[client] || db.sqlite : db.sqlite,
  };
};
