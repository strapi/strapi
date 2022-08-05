'use strict';

module.exports = {
  permission: { schema: require('./Permission') },
  user: { schema: require('./User') },
  role: { schema: require('./Role') },
  'api-token': { schema: require('./api-token') },
  'token-permission': { schema: require('./token-permission') },
};
