const _ = require('lodash');

module.exports = config => {
  return _.join(config.get('server.loader.extensions', ['js', 'json']), '|');
};
