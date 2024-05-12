import type { Strapi } from '@strapi/types';
import type { TypeRegistry } from './type-registry';

export type Context = {
  strapi: Strapi;
  registry: TypeRegistry;
};
