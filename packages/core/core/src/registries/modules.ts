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
    add(namespace: string, rawModule: RawModule) {
      if (has(namespace, modules)) {
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
  };
};

export default modulesRegistry;
