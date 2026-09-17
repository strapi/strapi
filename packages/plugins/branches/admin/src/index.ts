import * as React from 'react';

import { BranchChangesPanel } from './components/BranchChangesPanel';
import { BranchHeaderAction } from './components/BranchHeaderAction';
import { addBranchColumnHook } from './components/BranchListCell';
import { BranchPicker } from './components/BranchPicker';
import { guardBulkAction, guardDocumentAction } from './components/guardActions';
import { pluginId } from './pluginId';
import { installBranchHeaderInterceptor } from './utils/fetchInterceptor';
import { getTranslation } from './utils/getTranslation';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type {
  BulkActionComponent,
  ContentManagerPlugin,
  DocumentActionComponent,
  HeaderActionComponent,
  PanelComponent,
} from '@strapi/content-manager/strapi-admin';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    // Every backend request from the admin carries the active branch from now on.
    installBranchHeaderInterceptor();

    app.registerPlugin({
      id: pluginId,
      name: pluginId,
    });
  },
  bootstrap(app: StrapiApp) {
    const contentManager = app.getPlugin('content-manager');
    if (!contentManager) {
      return;
    }
    const apis = contentManager.apis as ContentManagerPlugin['config']['apis'];

    // Branches live inside the Content Manager: the management pages mount at
    // /content-manager/plugins/branches with a link in its sub-navigation.
    apis.addPage([
      {
        id: pluginId,
        title: { id: getTranslation('plugin.name'), defaultMessage: 'Branches' },
        Component: React.lazy(() => import('./pages/App').then((mod) => ({ default: mod.App }))),
      },
    ]);

    // Branch picker in the list view toolbar (same zone as the locale picker)…
    contentManager.injectComponent('listView', 'actions', {
      name: 'branches-picker',
      Component: BranchPicker,
    });

    // …and in the edit view header (same seam as i18n's locale picker).
    apis.addDocumentHeaderAction((actions: HeaderActionComponent[]) => [
      ...actions,
      BranchHeaderAction,
    ]);

    // "Branch changes" side panel with the way back to the parent's version.
    apis.addEditViewSidePanel((panels: PanelComponent[]) => [...panels, BranchChangesPanel]);

    // Publishing is not available on a branch: hide the actions there.
    apis.addDocumentAction((actions: DocumentActionComponent[]) =>
      actions.map(guardDocumentAction)
    );
    apis.addBulkAction((actions: BulkActionComponent[]) => actions.map(guardBulkAction));

    // "Branch" column in the list view.
    app.registerHook('Admin/CM/pages/ListView/inject-column-in-table', addBranchColumnHook);
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
