'use strict';

module.exports = scope => {
  // Production/Staging Template
  if (['production', 'staging'].includes(scope.keyPath.split('/')[2])) {
    // All available settings (bookshelf and mongoose)
    const settingsBase = {
      client: scope.client.database,
      host: '${process.env.DATABASE_HOST || \'127.0.0.1\'}',
      port: '${process.env.DATABASE_PORT || 27017}',
      srv: '${process.env.DATABASE_SRV || false}',
      database: '${process.env.DATABASE_NAME || \'strapi\'}',
      username: '${process.env.DATABASE_USERNAME || \'\'}',
      password: '${process.env.DATABASE_PASSWORD || \'\'}',
      ssl: '${process.env.DATABASE_SSL || false}'
    };

    // Apply only settings set during the configuration
    Object.keys(scope.database.settings).forEach((key) => {
      scope.database.settings[key] = settingsBase[key];
    });

    // All available options (bookshelf and mongoose)
    const optionsBase = {
      ssl: '${process.env.DATABASE_SSL || false}',
      authenticationDatabase: '${process.env.DATABASE_AUTHENTICATION_DATABASE || \'\'}'
    };

    // Apply only options set during the configuration
    Object.keys(scope.database.options).forEach((key) => {
      scope.database.options[key] = optionsBase[key];
    });

    return {
      defaultConnection: 'default',
      connections: {
        default: {
          connector: scope.client.connector,
          settings: scope.database.settings,
          options: scope.database.options
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
