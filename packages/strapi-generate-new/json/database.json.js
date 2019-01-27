'use strict';

module.exports = scope => {
  // Production/Staging Template
  if (['production', 'staging'].includes(scope.keyPath.split('/')[2])) {
    // All available settings (bookshelf and mongoose)
    const settingsBase = {
      client: scope.client.database,
      host: '${process.env.DATABASE_HOST || 127.0.0.1 }',
      port: '${process.env.DATABASE_PORT || 27017 }',
      srv: '${process.env.DATABASE_SRV || false }',
      database: '${process.env.DATABASE_NAME || strapi }',
      username: '${process.env.DATABASE_USERNAME || \'\' }',
      password: '${process.env.DATABASE_PASSWORD || \'\' }',
      ssl: '${process.env.DATABASE_SSL || false }'
    };

    // Apply only settings set during the configuration
    const settings = Object.keys(scope.database.settings).reduce((acc, key) => {
      acc[key] = settingsBase[key];
      return acc;
    }, {});

    // All available options (bookshelf and mongoose)
    const optionsBase = {
      ssl: '${process.env.DATABASE_SSL || false }',
      authenticationDatabase: '${process.env.DATABASE_AUTHENTICATION_DATABASE || \'\' }'
    };

    // Apply only options set during the configuration
    const options = Object.keys(scope.database.options).reduce((acc, key) => {
      acc[key] = optionsBase[key];
      return acc;
    }, {});

    return {
      defaultConnection: 'default',
      connections: {
        default: {
          connector: scope.client.connector,
          settings,
          options
        }
      }
    };
  }

  return {
    defaultConnection: 'default',
    connections: {
      default: scope.database
    }
  };
};
