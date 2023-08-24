/* eslint-disable no-var */
/* eslint-disable vars-on-top */
import type { Strapi as StrapiInterface } from './Strapi';

declare global {
  var strapi: StrapiInterface;
}
