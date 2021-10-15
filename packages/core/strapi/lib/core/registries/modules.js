'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 * @typedef {import('@strapi/strapi').StrapiModules} StrapiModules
 */

const { pickBy, has } = require('lodash/fp');
const { createModule } = require('../domain/module');

/**
 * @param {Strapi} strapi
 */
const modulesRegistry = strapi => {
  /**
   * @type {StrapiModules}
   */
  // @ts-ignore
  const modules = {};

  return {
    /**
     * @template {keyof StrapiModules} T
     * @param {T} namespace
     */
    get(namespace) {
      return modules[namespace];
    },
    /**
     * @param {string=} prefix
     */
    getAll(prefix = '') {
      return pickBy((mod, namespace) => namespace.startsWith(prefix))(modules);
    },
    /**
     * @template {keyof StrapiModules} T
     * @param {T} namespace
     * @param {any} rawModule
     */
    add(namespace, rawModule) {
      if (has(namespace, modules)) {
        throw new Error(`Module ${namespace} has already been registered.`);
      }

      // @ts-ignore
      modules[namespace] = createModule(namespace, rawModule, strapi);
      // @ts-ignore
      modules[namespace].load();

      return modules[namespace];
    },
    async bootstrap() {
      for (const mod of Object.values(modules)) {
        await mod.bootstrap();
      }
    },
    async register() {
      for (const mod of Object.values(modules)) {
        await mod.register();
      }
    },
    async destroy() {
      for (const mod of Object.values(modules)) {
        await mod.destroy();
      }
    },
  };
};

module.exports = modulesRegistry;
