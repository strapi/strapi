'use strict';

const { BaseRegistry } = require('./core/registries/base');

class Container {
  constructor(strapi) {
    this.strapi = strapi;
    this.registered = new Map();
    this.resolved = new Map();
  }

  register(name, resolver) {
    if (!(resolver instanceof BaseRegistry)) {
      throw new Error(`Cannot register service ${name}: should extends BaseRegistry`);
    }

    if (this.registered.has(name)) {
      throw new Error(`Cannot register already registered service ${name}`);
    }

    this.registered.set(name, resolver);
    return this;
  }

  get(name, args) {
    // TODO: handle singleton vs reinstanciation everytime
    if (this.resolved.has(name)) {
      return this.resolved.get(name);
    }

    if (this.registered.has(name)) {
      const resolver = this.registered.get(name);

      if (typeof resolver === 'function') {
        this.resolved.set(name, resolver({ strapi: this.strapi }, args));
      } else {
        this.resolved.set(name, resolver);
      }

      return this.resolved.get(name);
    }

    throw new Error(`Could not resolve service ${name}`);
  }

  // TODO: implement
  extend() {}
}

const createContainer = strapi => {
  return new Container(strapi);
};

module.exports = {
  createContainer,
};
