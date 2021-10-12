import { Strapi as StrapiClass } from '../lib/Strapi';
import { Server } from '@strapi/admin';

export * from './base';
export * from './container';
export * from './configuration';
export * from './content-type';
export * from './hooks';

export { Strapi };

interface Strapi extends StrapiClass {
  admin?: Server;
}

declare global {
  var strapi: Strapi;
}
