'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');
const { BaseRegistry } = require('./base');

class ControllersRegistry extends BaseRegistry {
  constructor(strapi) {
    super(strapi);
    this.controllers = {};
  }
  get(uid) {
    return this.controllers[uid];
  }
  getAll(namespace) {
    return pickBy((_, uid) => hasNamespace(uid, namespace))(this.controllers);
  }
  set(uid, value) {
    this.controllers[uid] = value;
    return this;
  }
  add(namespace, newControllers) {
    for (const controllerName in newControllers) {
      const controller = newControllers[controllerName];
      const uid = addNamespace(controllerName, namespace);

      if (has(uid, this.controllers)) {
        throw new Error(`Controller ${uid} has already been registered.`);
      }
      this.controllers[uid] = controller;
    }
    return this;
  }
  extend(controllerUID, extendFn) {
    const currentController = this.get(controllerUID);
    if (!currentController) {
      throw new Error(`Controller ${controllerUID} doesn't exist`);
    }
    const newController = extendFn(currentController);
    this.controllers[controllerUID] = newController;
  }
}

const createControllersRegistry = strapi => {
  return new ControllersRegistry(strapi);
};

module.exports = createControllersRegistry;
module.exports.ControllersRegistry = ControllersRegistry;
