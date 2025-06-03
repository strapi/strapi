import { PaperPlane } from '@strapi/icons';

import { ReleaseAction } from './components/ReleaseAction';
import { ReleaseActionModalForm } from './components/ReleaseActionModal';
import { addColumnToTableHook } from './components/ReleaseListCell';
import { Panel as ReleasesPanel } from './components/ReleasesPanel';
import { PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type {
  DocumentActionComponent,
  BulkActionComponent,
} from '@strapi/content-manager/strapi-admin';
import type { Plugin } from '@strapi/types';

// eslint-disable-next-line import/no-default-export
const admin: Plugin.Config.AdminInput = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(app: StrapiApp) {
    /**
     * Hook that adds the locale column in the Release Details table
     * @constant
     * @type {string}
     */
    app.createHook('ContentReleases/pages/ReleaseDetails/add-locale-in-releases');

    if (window.strapi.features.isEnabled('cms-content-releases')) {
      app.addMenuLink({
        to: `plugins/${pluginId}`,
        icon: PaperPlane,
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: 'Releases',
        },
        Component: () => import('./pages/App').then((mod) => ({ default: mod.App })),
        permissions: PERMISSIONS.main,
        position: 2,
      });

      // Insert the releases container into the CM's sidebar on the Edit View
      const contentManagerPluginApis = app.getPlugin('content-manager').apis;
      if (
        'addEditViewSidePanel' in contentManagerPluginApis &&
        typeof contentManagerPluginApis.addEditViewSidePanel === 'function'
      ) {
        contentManagerPluginApis.addEditViewSidePanel([ReleasesPanel]);
      }

      // Insert the "add to release" action into the CM's Edit View
      if (
        'addDocumentAction' in contentManagerPluginApis &&
        typeof contentManagerPluginApis.addDocumentAction === 'function'
      ) {
        contentManagerPluginApis.addDocumentAction((actions: DocumentActionComponent[]) => {
          const indexOfDeleteAction = actions.findIndex((action) => action.type === 'unpublish');
          actions.splice(indexOfDeleteAction, 0, ReleaseActionModalForm);
          return actions;
        });
      }

      app.addSettingsLink('global', {
        id: pluginId,
        to: 'releases',
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: 'Releases',
        },
        permissions: [],
        async Component() {
          const { ProtectedReleasesSettingsPage } = await import('./pages/ReleasesSettingsPage');
          return { default: ProtectedReleasesSettingsPage };
        },
      });

      if (
        'addBulkAction' in contentManagerPluginApis &&
        typeof contentManagerPluginApis.addBulkAction === 'function'
      ) {
        contentManagerPluginApis.addBulkAction((actions: BulkActionComponent[]) => {
          // We want to add this action to just before the delete action all the time
          const deleteActionIndex = actions.findIndex((action) => action.type === 'delete');

          actions.splice(deleteActionIndex, 0, ReleaseAction);
          return actions;
        });
      }

      // Hook that adds a column into the CM's LV table
      app.registerHook('Admin/CM/pages/ListView/inject-column-in-table', addColumnToTableHook);
    } else if (
      !window.strapi.features.isEnabled('cms-content-releases') &&
      window.strapi?.flags?.promoteEE
    ) {
      app.addSettingsLink('global', {
        id: pluginId,
        to: '/plugins/purchase-content-releases',
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: 'Releases',
        },
        permissions: [],
        async Component() {
          const { PurchaseContentReleases } = await import('./pages/PurchaseContentReleases');
          return { default: PurchaseContentReleases };
        },
        licenseOnly: true,
      });
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, 'content-releases'),
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

// eslint-disable-next-line import/no-default-export
export default admin;
