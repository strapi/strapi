import React from 'react';
import * as yup from 'yup';
import pluginPkg from '../../package.json';
import middlewares from './middlewares';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';
import trads from './translations';
import { getTrad } from './utils';
import CheckboxConfirmation from './components/CheckboxConfirmation';
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
        ctbFormsAPI.components.add({ id: 'checkboxConfirmation', component: CheckboxConfirmation });

        ctbFormsAPI.extendContentType({
          validator: () => ({
            i18n: yup.object().shape({
              localized: yup.bool(),
            }),
          }),
          form: {
            advanced() {
              return [
                [
                  {
                    name: 'pluginOptions.i18n.localized',
                    description: { id: getTrad('plugin.schema.i18n.localized.description') },
                    type: 'checkboxConfirmation',
                    label: { id: getTrad('plugin.schema.i18n.localized.label') },
                  },
                ],
              ];
            },
          },
        });

        ctbFormsAPI.extendFields(['text', 'string'], {
          validator: () => ({
            i18n: yup.object().shape({
              localized: yup.bool(),
            }),
          }),
          form: {
            advanced() {
              return [[{ name: 'localized', type: 'checkbox', label: { id: 'i18nTest' } }]];
            },
          },
        });
      }
    },
  };

  return strapi.registerPlugin(plugin);
};
