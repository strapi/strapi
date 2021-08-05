'use strict';

const createContainer = strapi => {
  const registerd = new Map();
  const resolved = new Map();

  return {
    register(name, resolver) {
      if (registerd.has(name)) {
        throw new Error(`Cannot register already registered service ${name}`);
      }

      registerd.set(name, resolver);
      return this;
    },

    get(name, args) {
      // TODO: handle singleton vs reinstanciation everytime
      if (resolved.has(name)) {
        return resolved.get(name);
      }

      if (registerd.has(name)) {
        const resolver = registerd.get(name);

        if (typeof resolver === 'function') {
          resolved.set(name, resolver({ strapi }, args));
        } else {
          resolved.set(name, resolver);
        }

        return resolved.get(name);
      }

      throw new Error(`Could not resovle service ${name}`);
    },

    // TODO: implement
    extend() {},
  };
};

module.exports = {
  createContainer,
};
