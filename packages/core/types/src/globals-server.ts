import type { Strapi } from './core/strapi';

declare global {
  /**
   * @deprecated since version 5.x. Will be removed in 6.x. Use a factory function instead.
   */
  // eslint-disable-next-line vars-on-top, no-var
  var strapi: Strapi;
}
