'use strict';

module.exports = ({ connection, env }) => {
  // Production/Staging Template
  if (['production', 'staging'].includes(env)) {
    const settingsBase = {
      client: connection.settings.client,
      host: "${process.env.DATABASE_HOST || '127.0.0.1'}",
      port: '${process.env.DATABASE_PORT || 27017}',
      database: "${process.env.DATABASE_NAME || 'strapi'}",
      username: "${process.env.DATABASE_USERNAME || ''}",
      password: "${process.env.DATABASE_PASSWORD || ''}",
    };

    const optionsBase = {};

    return {
      defaultConnection: 'default',
      connections: {
        default: {
          connector: connection.connector,
          settings: settingsBase,
          options: optionsBase,
        },
      },
    };
  }

  return {
    defaultConnection: 'default',
    connections: {
      default: connection,
    },
  };
};
