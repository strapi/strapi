import { Strapi } from '../lib/Strapi';
import { Server } from '@strapi/admin';
import Boom from '@hapi/boom';

declare global {
  var strapi: Strapi;
}

export * from './base';
export * from './container';
export * from './configuration';
export * from './content-type';
export * from './hooks';
export * from './strapi';

export { Strapi };
