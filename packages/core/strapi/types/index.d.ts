import { Strapi as StrapiClass } from '../lib/Strapi';
import { Server } from '@strapi/admin';

interface Strapi extends StrapiClass {
  admin?: Server;
  components?: Record<string, any>;
}

declare global {
  var strapi: Strapi;
}

export * from './base';
export * from './container';
export * from './configuration';
export * from './content-type';
export * from './hooks';

export { Strapi };
