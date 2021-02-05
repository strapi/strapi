import React from 'react';
import { get } from 'lodash';
import * as yup from 'yup';
import pluginPkg from '../../package.json';
import middlewares from './middlewares';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';
import trads from './translations';
import { getTrad } from './utils';
import pluginPermissions from './permissions';
import CheckboxConfirmation from './components/CheckboxConfirmation';
import SettingsPage from './containers/SettingsPage';
import sanitizeCTBContentTypeSchema from './utils/sanitizeCTBContentTypeSchema';
import LOCALIZED_FIELDS from './utils/localizedFields';

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
        ctbFormsAPI.addContentTypeSchemaSanitizer(sanitizeCTBContentTypeSchema);
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
                    description: {
                      id: getTrad('plugin.schema.i18n.localized.description-content-type'),
                    },
                    type: 'checkboxConfirmation',
                    label: { id: getTrad('plugin.schema.i18n.localized.label-content-type') },
                  },
                ],
              ];
            },
          },
        });

        ctbFormsAPI.extendFields(LOCALIZED_FIELDS, {
          validator: () => ({
            i18n: yup.object().shape({
              localized: yup.bool(),
            }),
          }),
          form: {
            advanced({ contentTypeSchema, forTarget, type, step }) {
              if (forTarget !== 'contentType') {
                return [];
              }

              const hasI18nEnabled = get(
                contentTypeSchema,
                ['schema', 'pluginOptions', 'i18n', 'localized'],
                false
              );

              if (!hasI18nEnabled) {
                return [];
              }

              if (type === 'component' && step === '1') {
                return [];
              }

              return [
                [
                  {
                    name: 'pluginOptions.i18n.localized',
                    description: {
                      id: getTrad('plugin.schema.i18n.localized.description-field'),
                    },
                    type: 'checkbox',
                    label: { id: getTrad('plugin.schema.i18n.localized.label-field') },
                  },
                ],
              ];
            },
          },
        });
      }
    },
  };

  return strapi.registerPlugin(plugin);
};
