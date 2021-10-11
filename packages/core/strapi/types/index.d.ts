import { Strapi } from './strapi';

export * from './container';
export * from './configuration';
export * from './content-type';

export { Strapi };

declare global {
  const strapi: Strapi;
}
