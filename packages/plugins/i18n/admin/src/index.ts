import { prefixPluginTranslations } from '@strapi/helper-plugin';
import get from 'lodash/get';
import * as yup from 'yup';

import { CheckboxConfirmation } from './components/CheckboxConfirmation';
import { DeleteLocaleAction, LocalePickerAction } from './components/CMHeaderActions';
import {
  DeleteModalAdditionalInfo,
  PublishModalAdditionalInfo,
  UnpublishModalAdditionalInfo,
} from './components/CMListViewModalsAdditionalInformation';
import { Initializer } from './components/Initializer';
import { LocalePicker } from './components/LocalePicker';
import { PERMISSIONS } from './constants';
import { addColumnToTableHook } from './contentManagerHooks/listView';
import { extendCTBAttributeInitialDataMiddleware } from './middlewares/extendCTBAttributeInitialData';
import { extendCTBInitialDataMiddleware } from './middlewares/extendCTBInitialData';
import { localePermissionMiddleware } from './middlewares/localePermission';
import { pluginId } from './pluginId';
import { i18nApi } from './services/api';
import { LOCALIZED_FIELDS } from './utils/fields';
import { getTranslation } from './utils/getTranslation';
import { mutateCTBContentTypeSchema } from './utils/schemas';

import type { DocumentActionComponent } from '@strapi/strapi/admin';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: any) {
    app.addMiddlewares([
      extendCTBAttributeInitialDataMiddleware,
      extendCTBInitialDataMiddleware,
      localePermissionMiddleware,
    ]);
    app.addMiddlewares([() => i18nApi.middleware]);
    app.addReducers({
      [i18nApi.reducerPath]: i18nApi.reducer,
    });
    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name: pluginId,
    });
  },
  bootstrap(app: any) {
    // // Hook that adds a column into the CM's LV table
    app.registerHook('Admin/CM/pages/ListView/inject-column-in-table', addColumnToTableHook);

    // Add the settings link
    app.addSettingsLink('global', {
      intlLabel: {
        id: getTranslation('plugin.name'),
        defaultMessage: 'Internationalization',
      },
      id: 'internationalization',
      to: 'internationalization',
      Component: () =>
        import('./pages/SettingsPage').then((mod) => ({ default: mod.ProtectedSettingsPage })),
      permissions: PERMISSIONS.accessMain,
    });

    const contentManager = app.getPlugin('content-manager');

    contentManager.apis.addDocumentHeaderAction([LocalePickerAction]);
    contentManager.apis.addDocumentAction((actions: DocumentActionComponent[]) => {
      const indexOfDeleteAction = actions.findIndex((action) => action.type === 'delete');
      actions.splice(indexOfDeleteAction, 0, DeleteLocaleAction);
      return actions;
    });

    app.injectContentManagerComponent('listView', 'actions', {
      name: 'i18n-locale-filter',
      Component: LocalePicker,
    });

    app.injectContentManagerComponent('listView', 'deleteModalAdditionalInfos', {
      name: 'i18n-delete-bullets-in-modal',
      Component: DeleteModalAdditionalInfo,
    });

    app.injectContentManagerComponent('listView', 'publishModalAdditionalInfos', {
      name: 'i18n-publish-bullets-in-modal',
      Component: PublishModalAdditionalInfo,
    });

    app.injectContentManagerComponent('listView', 'unpublishModalAdditionalInfos', {
      name: 'i18n-unpublish-bullets-in-modal',
      Component: UnpublishModalAdditionalInfo,
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
                  id: getTranslation('plugin.schema.i18n.localized.description-content-type'),
                  defaultMessage: 'Allows translating an entry into different languages',
                },
                type: 'checkboxConfirmation',
                intlLabel: {
                  id: getTranslation('plugin.schema.i18n.localized.label-content-type'),
                  defaultMessage: 'Localization',
                },
              },
            ];
          },
        },
      });

      ctbFormsAPI.extendFields(LOCALIZED_FIELDS, {
        validator: (args: any) => ({
          i18n: yup.object().shape({
            localized: yup.bool().test({
              name: 'ensure-unique-localization',
              message: getTranslation('plugin.schema.i18n.ensure-unique-localization'),
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
          advanced({ contentTypeSchema, forTarget, type, step }: any) {
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
                  id: getTranslation('plugin.schema.i18n.localized.description-field'),
                  defaultMessage: 'The field can have different values in each locale',
                },
                type: 'checkbox',
                intlLabel: {
                  id: getTranslation('plugin.schema.i18n.localized.label-field'),
                  defaultMessage: 'Enable localization for this field',
                },
              },
            ];
          },
        },
      });
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
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
