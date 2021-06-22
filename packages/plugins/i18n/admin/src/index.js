import get from 'lodash/get';
import * as yup from 'yup';
import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import CheckboxConfirmation from './components/CheckboxConfirmation';
import CMEditViewInjectedComponents from './components/CMEditViewInjectedComponents';
import Initializer from './components/Initializer';
import SettingsPage from './pages/SettingsPage';
import LocalePicker from './components/LocalePicker';
import middlewares from './middlewares';
import pluginPermissions from './permissions';
import pluginId from './pluginId';
import { getTrad } from './utils';
import mutateCTBContentTypeSchema from './utils/mutateCTBContentTypeSchema';
import LOCALIZED_FIELDS from './utils/localizedFields';
import i18nReducers from './hooks/reducers';
import DeleteModalAdditionalInfos from './components/DeleteModalAdditionalInfos';
import addColumnToTableHook from './contentManagerHooks/addColumnToTable';

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const icon = pluginPkg.strapi.icon;
const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMiddlewares(middlewares);

    app.addReducers(i18nReducers);

    app.registerPlugin({
      description: pluginDescription,
      icon,
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      isRequired: pluginPkg.strapi.required || false,
      name,
      pluginLogo,
    });
  },
  boot(app) {
    app.registerHook('cm/inject-column-in-table', addColumnToTableHook);
    // Add the settings link
    app.addSettingsLink('global', {
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'Internationalization',
      },
      id: 'internationalization',
      to: '/settings/internationalization',
      Component: SettingsPage,
      permissions: pluginPermissions.accessMain,
    });

    const ctbPlugin = app.getPlugin('content-type-builder');
    const cmPlugin = app.getPlugin('content-manager');

    if (cmPlugin) {
      cmPlugin.injectComponent('editView', 'informations', {
        name: 'i18n-locale-filter-edit-view',
        Component: CMEditViewInjectedComponents,
      });
      cmPlugin.injectComponent('listView', 'actions', {
        name: 'i18n-locale-filter',
        Component: LocalePicker,
      });

      cmPlugin.injectComponent('listView', 'deleteModalAdditionalInfos', {
        name: 'i18n-delete-bullets-in-modal',
        Component: DeleteModalAdditionalInfos,
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
        validator: args => ({
          i18n: yup.object().shape({
            localized: yup.bool().test({
              name: 'ensure-unique-localization',
              message: getTrad('plugin.schema.i18n.ensure-unique-localization'),
              test(value) {
                if (value === undefined || value) {
                  return true;
                }

                const unique = get(args, ['3', 'modifiedData', 'unique'], null);

                // Unique fields must be localized
                if (unique && !value) {
                  return false;
                }

                return true;
              },
            }),
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
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map(locale => {
        return import(
          /* webpackChunkName: "i18n-translation-[request]" */ `./translations/${locale}.json`
        )
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};
