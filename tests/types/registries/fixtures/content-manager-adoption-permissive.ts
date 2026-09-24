import type { Core } from '@strapi/strapi';
import type { Controllers } from '@strapi/content-manager/strapi-server';

declare const app: Core.Strapi;

app.plugin('content-manager').service('uid').checkUIDAvailability({ value: 3 });
app.service('plugin::content-manager.document-manager').missing();
app.plugin('content-manager').service('document-metadata').getMetadata('anything', null);
app.service('plugin::content-manager.populate-builder').custom();
app.plugin('content-manager').controller('collection-types').custom satisfies
  | Core.ControllerHandler
  | undefined;

({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'init.getInitData',
      config: {
        policies: [{ name: 'hasPermissions', config: { hasAtLeastOne: 'yes' } }, 'custom'],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers.RegisteredControllers, 'plugin::content-manager'>;
