'use strict';

const _ = require('lodash');
const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');
const { BaseRegistry } = require('./base');

/**
 * @typedef {import('./services').Service} Service
 * @typedef {import('./services').ServiceFactory} ServiceFactory
 */

class ServicesRegistry extends BaseRegistry {
  constructor(strapi) {
    super(strapi);
    this.services = {};
    this.instantiatedServices = {};
  }
  /**
   * Returns this list of registered services uids
   * @returns {string[]}
   */
  keys() {
    return Object.keys(this.services);
  }

  /**
   * Returns the instance of a service. Instantiate the service if not already done
   * @param {string} uid
   * @returns {Service}
   */
  get(uid) {
    if (this.instantiatedServices[uid]) {
      return this.instantiatedServices[uid];
    }

    const service = this.services[uid];
    if (service) {
      this.instantiatedServices[uid] =
        typeof service === 'function' ? service({ strapi }) : service;
      return this.instantiatedServices[uid];
    }

    return undefined;
  }

  /**
   * Returns a map with all the services in a namespace
   * @param {string} namespace
   * @returns {{ [key: string]: Service }}
   */
  getAll(namespace) {
    const filteredServices = pickBy((_, uid) => hasNamespace(uid, namespace))(this.services);

    return _.mapValues(filteredServices, (service, serviceUID) => this.get(serviceUID));
  }

  /**
   * Registers a service
   * @param {string} uid
   * @param {Service|ServiceFactory} service
   */
  set(uid, service) {
    this.instantiatedServices[uid] = service;
    return this;
  }

  /**
   * Registers a map of services for a specific namespace
   * @param {string} namespace
   * @param {{ [key: string]: Service|ServiceFactory }} newServices
   * @returns
   */
  add(namespace, newServices) {
    for (const serviceName in newServices) {
      const service = newServices[serviceName];
      const uid = addNamespace(serviceName, namespace);

      if (has(uid, this.services)) {
        throw new Error(`Service ${uid} has already been registered.`);
      }
      this.services[uid] = service;
    }

    return this;
  }

  /**
   * Wraps a service to extend it
   * @param {string} uid
   * @param {(service: Service) => Service} extendFn
   */
  extend(uid, extendFn) {
    const currentService = this.get(uid);

    if (!currentService) {
      throw new Error(`Service ${uid} doesn't exist`);
    }

    const newService = extendFn(currentService);
    this.instantiatedServices[uid] = newService;

    return this;
  }
}

const createServicesRegistry = strapi => {
  return new ServicesRegistry(strapi);
};

module.exports = createServicesRegistry;
module.exports.ServicesRegistry = ServicesRegistry;
