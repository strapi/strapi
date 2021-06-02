'use strict'
module.exports = (services) => {
  return {
    get(serviceName) {
      return services[serviceName];
    }
  }
};
