'use strict';

module.exports = ({ connection, env }) => {
  // Production/Staging Template
  if (['production', 'staging'].includes(env)) {
    // All available settings (bookshelf and mongoose)
    const settingsBase = {
      client: connection.settings.client,
      host: "${process.env.DATABASE_HOST || '127.0.0.1'}",
      port: '${process.env.DATABASE_PORT || 27017}',
      srv: '${process.env.DATABASE_SRV || false}',
      database: "${process.env.DATABASE_NAME || 'strapi'}",
      username: "${process.env.DATABASE_USERNAME || ''}",
      password: "${process.env.DATABASE_PASSWORD || ''}",
      ssl: '${process.env.DATABASE_SSL || false}',
    };

    // All available options (bookshelf and mongoose)
    const optionsBase = {
      ssl: '${process.env.DATABASE_SSL || false}',
      authenticationDatabase:
        "${process.env.DATABASE_AUTHENTICATION_DATABASE || ''}",
    };

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
