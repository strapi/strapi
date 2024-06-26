import { prefixPluginTranslations } from '@strapi/helper-plugin';
import get from 'lodash/get';
import * as yup from 'yup';

import { CheckboxConfirmation } from './components/CheckboxConfirmation';
import { CMEditViewInjectedComponents } from './components/CMEditViewInjectedComponents';
import {
  DeleteModalAdditionalInfo,
  PublishModalAdditionalInfo,
  UnpublishModalAdditionalInfo,
} from './components/CMListViewModalsAdditionalInformation';
import { Initializer } from './components/Initializer';
import { LocalePicker } from './components/LocalePicker';
import { PERMISSIONS } from './constants';
import { addLocaleToLinksHook } from './contentManagerHooks/app';
import { mutateEditViewLayoutHook } from './contentManagerHooks/editView';
import { addColumnToTableHook } from './contentManagerHooks/listView';
import { addLocaleToReleasesHook } from './contentReleasesHooks/releaseDetailsView';
import { addCommonFieldsToInitialDataMiddleware } from './middlewares/addCommonFieldsToInitialData';
import { extendCTBAttributeInitialDataMiddleware } from './middlewares/extendCTBAttributeInitialData';
import { extendCTBInitialDataMiddleware } from './middlewares/extendCTBInitialData';
import { localePermissionMiddleware } from './middlewares/localePermission';
import { pluginId } from './pluginId';
import { reducers } from './store/reducers';
import { LOCALIZED_FIELDS } from './utils/fields';
import { getTranslation } from './utils/getTranslation';
import { mutateCTBContentTypeSchema } from './utils/schemas';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: any) {
    app.addMiddlewares([
      addCommonFieldsToInitialDataMiddleware,
      extendCTBAttributeInitialDataMiddleware,
      extendCTBInitialDataMiddleware,
      localePermissionMiddleware,
    ]);

    /**
     * TODO: this should use the `useInjectReducer` hook when it's exported from the `@strapi/admin` package.
     */
    app.addReducers(reducers);

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name: pluginId,
    });
  },
  bootstrap(app: any) {
    // Hooks that mutate the collection types links in order to add the locale filter
    app.registerHook(
      'Admin/CM/pages/App/mutate-collection-types-links',
      addLocaleToLinksHook('collection-types')
    );
    app.registerHook(
      'Admin/CM/pages/App/mutate-single-types-links',
      addLocaleToLinksHook('single-types')
    );
    // Hook that adds a column into the CM's LV table
    app.registerHook('Admin/CM/pages/ListView/inject-column-in-table', addColumnToTableHook);
    // Hooks that mutates the edit view layout
    app.registerHook('Admin/CM/pages/EditView/mutate-edit-view-layout', mutateEditViewLayoutHook);
    // Hooks that checks if the locale is present in the release
    app.registerHook(
      'ContentReleases/pages/ReleaseDetails/add-locale-in-releases',
      addLocaleToReleasesHook
    );
    // Add the settings link
    app.addSettingsLink('global', {
      intlLabel: {
        id: getTranslation('plugin.name'),
        defaultMessage: 'Internationalization',
      },
      id: 'internationalization',
      to: '/settings/internationalization',

      async Component() {
        const { ProtectedSettingsPage } = await import('./pages/SettingsPage');

        return ProtectedSettingsPage;
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

    app.injectContentManagerComponent('listView', 'publishModalAdditionalInfos', {
      name: 'i18n-publish-bullets-in-modal',
      Component: PublishModalAdditionalInfo,
    });

    app.injectContentManagerComponent('listView', 'unpublishModalAdditionalInfos', {
      name: 'i18n-unpublish-bullets-in-modal',
      Component: UnpublishModalAdditionalInfo,
    });

    app.injectContentManagerComponent('listView', 'deleteModalAdditionalInfos', {
      name: 'i18n-delete-bullets-in-modal',
      Component: DeleteModalAdditionalInfo,
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
