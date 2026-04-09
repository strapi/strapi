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
      await Promise.all(Object.values(modules).map((mod) => mod.bootstrap()));
    },
    async register() {
      await Promise.all(Object.values(modules).map((mod) => mod.register()));
    },
    async destroy() {
      await Promise.all(Object.values(modules).map((mod) => mod.destroy()));
    },
  };
};

export default modulesRegistry;
