import type { Core } from '@strapi/types';
import type { TypeRegistry } from './type-registry';

export type Context = {
  strapi: Core.Strapi;
  registry: TypeRegistry;
};

export type StrapiContext = {
  strapi: Core.Strapi;
};
