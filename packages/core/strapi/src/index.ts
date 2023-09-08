import '@strapi/typings';
import strapiFactory from './Strapi';

export type * from '@strapi/typings';

export * as factories from './factories';
export { default as compile } from './compile';

export default strapiFactory;
