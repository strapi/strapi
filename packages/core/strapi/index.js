const strapi = require('./dist');

module.exports = strapi.default;
module.exports.factories = strapi.factories;
module.exports.compile = strapi.compile;
