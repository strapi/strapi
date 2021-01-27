import React from 'react';
import * as yup from 'yup';
import pluginPkg from '../../package.json';
import middlewares from './middlewares';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';
import trads from './translations';
import { getTrad } from './utils';
import SettingsPage from './containers/SettingsPage';
import pluginPermissions from './permissions';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

  middlewares.forEach(middleware => {
    strapi.middlewares.add(middleware);
  });

  const plugin = {
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    isReady: true,
    isRequired: pluginPkg.strapi.required || false,
    mainComponent: null,
    name: pluginPkg.strapi.name,
    pluginLogo,
    preventComponentRendering: false,
    settings: {
      global: {
        links: [
          {
            title: {
              id: getTrad('plugin.name'),
              defaultMessage: 'Internationalization',
            },
            name: 'internationalization',
            to: `${strapi.settingsBaseURL}/internationalization`,
            Component: () => <SettingsPage />,
            permissions: pluginPermissions.accessMain,
          },
        ],
      },
    },
    trads,
    boot(app) {
      const ctbPlugin = app.getPlugin('content-type-builder');

      if (ctbPlugin) {
        const ctbFormsAPI = ctbPlugin.apis.forms;
        ctbFormsAPI.components.add({ id: 'localesPicker', component: () => 'locale picker' });

        ctbFormsAPI.extendContentType({
          validator: () => ({
            i18n: yup.bool(),
          }),
          form: {
            advanced() {
              return [
                [{ name: 'i18n', type: 'checkbox', label: { id: 'i18nTest' } }],
                [
                  {
                    name: 'i18n-locales',
                    type: 'localesPicker',
                    label: { id: 'Select i18n locales' },
                  },
                ],
              ];
            },
          },
        });

        ctbFormsAPI.extendFields(['text', 'string'], {
          validator: () => ({
            localize: yup.bool(),
          }),
          form: {
            advanced(args) {
              console.log('advanced', args);

              return [[{ name: 'localized', type: 'checkbox', label: { id: 'i18nTest' } }]];
            },
          },
        });
      }
    },
  };

  return strapi.registerPlugin(plugin);
};
