import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;
declare const category: string | undefined;

// An optional field passed through as `undefined` compiles under `exactOptionalPropertyTypes`.
void app
  .service('admin::permission')
  .actionProvider.registerMany([
    { uid: 'read', section: 'plugins', displayName: 'Read', pluginName: 'example', category },
  ]);
