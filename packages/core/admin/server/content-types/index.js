'use strict';

module.exports = {
  permission: { schema: require('./Permission') },
  user: { schema: require('./User') },
  role: { schema: require('./Role') },
  'api-token': { schema: require('./api-token') },
  'api-token-permission': { schema: require('./api-token-permission') },
  'transfer-token': { schema: require('./transfer-token') },
  'transfer-token-permission': { schema: require('./transfer-token-permission') },
};
