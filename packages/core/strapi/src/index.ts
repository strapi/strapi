import strapiFactory from './Strapi';

export type * from '@strapi/types';

export * as factories from './factories';
export { default as compile } from './compile';

export default strapiFactory;
