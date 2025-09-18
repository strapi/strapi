import { pickBy, has } from 'lodash/fp';
import type { Core } from '@strapi/types';
import { createModule, RawModule, Module } from '../domain/module';

type ModuleMap = { [namespace: string]: Module };

const modulesRegistry = (strapi: Core.Strapi) => {
  const modules: ModuleMap = {};

  return {
    get(namespace: string) {
      return modules[namespace];
    },
    getAll(prefix = '') {
      return pickBy<ModuleMap>((mod, namespace) => namespace.startsWith(prefix))(modules);
    },
    add(namespace: string, rawModule: RawModule, options?: { force?: boolean }) {
      if (has(namespace, modules) && !options?.force) {
        throw new Error(`Module ${namespace} has already been registered.`);
      }

      modules[namespace] = createModule(namespace, rawModule, strapi);
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
    async softReset() {
      for (const mod of Object.values(modules)) {
        await mod.softReset?.();
      }
    },

    /**
     * Removes modules whose namespace starts with the given prefix (e.g. 'plugin::', 'api::')
     */
    removePrefix(prefix: string) {
      for (const namespace of Object.keys(modules)) {
        if (namespace.startsWith(prefix)) {
          delete modules[namespace];
        }
      }

      return this;
    },

    /**
     * Clears all modules
     */
    clear() {
      for (const namespace of Object.keys(modules)) {
        delete modules[namespace];
      }

      return this;
    },
  };
};

export default modulesRegistry;
