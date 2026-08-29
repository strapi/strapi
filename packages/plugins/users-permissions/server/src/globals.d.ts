import type { Core } from '@strapi/types';

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var strapi: Core.Strapi;
}

export {}; // Keeps file a module
