import React from 'react';
import { get } from 'lodash';
import * as yup from 'yup';
import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import CheckboxConfirmation from './components/CheckboxConfirmation';
import CMEditViewLocalePicker from './components/CMEditViewLocalePicker';
import Initializer from './containers/Initializer';
import SettingsPage from './containers/SettingsPage';
import LocalePicker from './components/LocalePicker';
import middlewares from './middlewares';
import pluginPermissions from './permissions';
import pluginId from './pluginId';
import trads from './translations';
import { getTrad } from './utils';
import mutateCTBContentTypeSchema from './utils/mutateCTBContentTypeSchema';
import LOCALIZED_FIELDS from './utils/localizedFields';
import i18nReducers from './hooks/reducers';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

  middlewares.forEach(middleware => {
    strapi.middlewares.add(middleware);
  });

  const plugin = {
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    isReady: false,
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
    reducers: i18nReducers,
    boot(app) {
      const ctbPlugin = app.getPlugin('content-type-builder');
      const cmPlugin = app.getPlugin('content-manager');

      if (cmPlugin) {
        cmPlugin.injectComponent('editView', 'informations', {
          name: 'i18n-locale-filter-edit-view',
          Component: CMEditViewLocalePicker,
        });
        cmPlugin.injectComponent('listView', 'actions', {
          name: 'i18n-locale-filter',
          Component: LocalePicker,
        });
      }

      if (ctbPlugin) {
        const ctbFormsAPI = ctbPlugin.apis.forms;
        ctbFormsAPI.addContentTypeSchemaMutation(mutateCTBContentTypeSchema);
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
    initializer: Initializer,
  };

  return strapi.registerPlugin(plugin);
};
