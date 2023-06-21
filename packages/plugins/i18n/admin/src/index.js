import { prefixPluginTranslations } from '@strapi/helper-plugin';
import get from 'lodash/get';
import * as yup from 'yup';

import pluginPkg from '../../package.json';

import CheckboxConfirmation from './components/CheckboxConfirmation';
import CMEditViewInjectedComponents from './components/CMEditViewInjectedComponents';
import DeleteModalAdditionalInfos from './components/CMListViewInjectedComponents/DeleteModalAdditionalInfos';
import PublishModalAdditionalInfos from './components/CMListViewInjectedComponents/PublishModalAdditionalInfos';
import UnpublishModalAdditionalInfos from './components/CMListViewInjectedComponents/UnpublishModalAdditionalInfos';
import Initializer from './components/Initializer';
import LocalePicker from './components/LocalePicker';
import { PERMISSIONS } from './constants';
import addColumnToTableHook from './contentManagerHooks/addColumnToTable';
import addLocaleToCollectionTypesLinksHook from './contentManagerHooks/addLocaleToCollectionTypesLinks';
import addLocaleToSingleTypesLinksHook from './contentManagerHooks/addLocaleToSingleTypesLinks';
import mutateEditViewLayoutHook from './contentManagerHooks/mutateEditViewLayout';
import i18nReducers from './hooks/reducers';
import middlewares from './middlewares';
import pluginId from './pluginId';
import { getTrad } from './utils';
import LOCALIZED_FIELDS from './utils/localizedFields';
import mutateCTBContentTypeSchema from './utils/mutateCTBContentTypeSchema';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMiddlewares(middlewares);

    app.addReducers(i18nReducers);

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },
  bootstrap(app) {
    // Hooks that mutate the collection types links in order to add the locale filter
    app.registerHook(
      'Admin/CM/pages/App/mutate-collection-types-links',
      addLocaleToCollectionTypesLinksHook
    );
    app.registerHook(
      'Admin/CM/pages/App/mutate-single-types-links',
      addLocaleToSingleTypesLinksHook
    );
    // Hook that adds a column into the CM's LV table
    app.registerHook('Admin/CM/pages/ListView/inject-column-in-table', addColumnToTableHook);
    // Hooks that mutates the edit view layout
    app.registerHook('Admin/CM/pages/EditView/mutate-edit-view-layout', mutateEditViewLayoutHook);
    // Add the settings link
    app.addSettingsLink('global', {
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'Internationalization',
      },
      id: 'internationalization',
      to: '/settings/internationalization',

      async Component() {
        const component = await import(
          /* webpackChunkName: "i18n-settings-page" */ './pages/SettingsPage'
        );

        return component;
      },
      permissions: PERMISSIONS.accessMain,
    });

    app.injectContentManagerComponent('editView', 'informations', {
      name: 'i18n-locale-filter-edit-view',
      Component: CMEditViewInjectedComponents,
    });

    app.injectContentManagerComponent('listView', 'actions', {
      name: 'i18n-locale-filter',
      Component: LocalePicker,
    });

    app.injectContentManagerComponent('listView', 'deleteModalAdditionalInfos', {
      name: 'i18n-delete-bullets-in-modal',
      Component: DeleteModalAdditionalInfos,
    });

    app.injectContentManagerComponent('listView', 'publishModalAdditionalInfos', {
      name: 'i18n-publish-bullets-in-modal',
      Component: PublishModalAdditionalInfos,
    });

    app.injectContentManagerComponent('listView', 'unpublishModalAdditionalInfos', {
      name: 'i18n-unpublish-bullets-in-modal',
      Component: UnpublishModalAdditionalInfos,
    });

    const ctbPlugin = app.getPlugin('content-type-builder');

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
              {
                name: 'pluginOptions.i18n.localized',
                description: {
                  id: getTrad('plugin.schema.i18n.localized.description-content-type'),
                  defaultMessage: 'Allows translating an entry into different languages',
                },
                type: 'checkboxConfirmation',
                intlLabel: {
                  id: getTrad('plugin.schema.i18n.localized.label-content-type'),
                  defaultMessage: 'Localization',
                },
              },
            ];
          },
        },
      });

      ctbFormsAPI.extendFields(LOCALIZED_FIELDS, {
        validator: (args) => ({
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
              {
                name: 'pluginOptions.i18n.localized',
                description: {
                  id: getTrad('plugin.schema.i18n.localized.description-field'),
                  defaultMessage: 'The field can have different values in each locale',
                },
                type: 'checkbox',
                intlLabel: {
                  id: getTrad('plugin.schema.i18n.localized.label-field'),
                  defaultMessage: 'Enable localization for this field',
                },
              },
            ];
          },
        },
      });
    }
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
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
