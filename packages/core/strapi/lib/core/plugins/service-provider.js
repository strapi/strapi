'use strict';

const { has } = require('lodash/fp');

module.exports = (servicesDefinitions, { strapi }) => {
  const instanciatedServices = {};

  const provider = serviceName => provider.get(serviceName);

  Object.assign(provider, {
    get(serviceName) {
      if (has(serviceName, instanciatedServices)) {
        return instanciatedServices[serviceName];
      }

      const service = servicesDefinitions[serviceName];
      if (service) {
        // if (isFunction(service)) {
        instanciatedServices[serviceName] = service({ strapi });
        // } else {
        //   instanciatedServices[serviceName] = service;
        // }
        return instanciatedServices[serviceName];
      }

      return undefined;
    },
  });

  return provider;
};
