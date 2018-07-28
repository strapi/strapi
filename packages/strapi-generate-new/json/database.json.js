'use strict';

module.exports = scope => {
  // Finally, return the JSON.
  // Production/Staging Template
  if (/production|staging/.test(scope.keyPath)) {
    return {
      defaultConnection: 'default', 
      connections: { 
        default: { 
          connector: scope.client.connector, 
          settings: { 
            client: scope.client.database, 
            uri: '${process.env.DATABASE_URI || \'\' }', 
            host: '${process.env.DATABASE_HOST || 127.0.0.1 }', 
            port: '${process.env.DATABASE_PORT || 27017 }', 
            database: '${process.env.DATABASE_NAME || strapi }', 
            username: '${process.env.DATABASE_USERNAME || \'\' }', 
            password: '${process.env.DATABASE_PASSWORD || \'\' }' 
          }, 
          'options': { 
            'ssl': '${process.env.DATABASE_SSL || false }', 
            'authenticationDatabase': '${process.env.DATABASE_AUTHENTICATION_DATABASE || \'\' }' 
          } 
        } 
      }
    };
  }
  // Dev Template
  return {
    defaultConnection: 'default',
    connections: {
      default: scope.database
    }
  };
};
