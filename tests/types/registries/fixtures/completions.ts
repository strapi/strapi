import type { Core } from '@strapi/strapi';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppServices {
        'api::article.article': { findPublished(): Promise<unknown[]> };
      }
      interface AppControllers {
        'api::article.article': { find: Core.ControllerHandler };
      }
    }
  }
}

declare const app: Core.Strapi;

// Each completion location is the first occurrence of its prefix in the consumer test.
app.plugin('');
app.api('');
app.config.get('');
app.config.get('plugin::sentry.');
app.config.get('plugin::sentry.init.');
app.plugin('sentry').config('');
app.plugin('sentry').config('init.');
app.plugin('i18n').service('');
app.plugin('i18n').controller('');
app.service('');
app.controller('');
app.policy('');
app.api('article').service('');
app.api('article').controller('');
export const serviceEntry = app.services[''];
export const pluginEntry = app.plugins.i18n;

declare const controllers: {
  locales: { listLocales: Core.ControllerHandler };
};

export const router: Core.RouterInputFor<typeof controllers, 'plugin::i18n'> = {
  type: 'admin',
  routes: [
    { method: 'GET', path: '/handler', handler: '' },
    { method: 'GET', path: '/names', handler: 'locales.listLocales', config: { policies: [''] } },
    {
      method: 'GET',
      path: '/objects',
      handler: 'locales.listLocales',
      config: { policies: [{ name: '', config: {} }] },
    },
    {
      method: 'GET',
      path: '/config',
      handler: 'locales.listLocales',
      config: { policies: [{ name: 'plugin::content-manager.hasPermissions', config: {} }] },
    },
  ],
};
