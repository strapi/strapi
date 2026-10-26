import { ProvenancePanel } from './components/ProvenancePanel';
import { PERMISSIONS, PLUGIN_ID } from './constants';
import { AiReviewFilter } from './content-manager/AiReviewFilter';
import { mutateEditViewHook } from './content-manager/EditViewLayout';
import { addColumnToTableHook } from './content-manager/ListViewColumn';
import { withPendingDeclarations } from './content-manager/PublishAction';
import { getTranslation, prefixPluginTranslations } from './utils/translations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type { DocumentActionComponent } from '@strapi/content-manager/strapi-admin';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });

    const contentManagerPluginApis = app.getPlugin('content-manager').apis;

    if (
      'addEditViewSidePanel' in contentManagerPluginApis &&
      typeof contentManagerPluginApis.addEditViewSidePanel === 'function'
    ) {
      contentManagerPluginApis.addEditViewSidePanel([ProvenancePanel]);
    }

    if (
      'addDocumentAction' in contentManagerPluginApis &&
      typeof contentManagerPluginApis.addDocumentAction === 'function'
    ) {
      contentManagerPluginApis.addDocumentAction((actions: DocumentActionComponent[]) =>
        actions.map((action) =>
          action.type === 'publish' ? withPendingDeclarations(action) : action
        )
      );
    }

    app.registerHook('Admin/CM/pages/ListView/inject-column-in-table', addColumnToTableHook);
    app.getPlugin('content-manager').injectComponent('listView', 'actions', {
      name: 'provenance-ai-review-filter',
      Component: AiReviewFilter,
    });

    app.addSettingsLink('global', {
      id: PLUGIN_ID,
      to: PLUGIN_ID,
      intlLabel: {
        id: getTranslation('plugin.name'),
        defaultMessage: 'Provenance',
      },
      permissions: PERMISSIONS.read,
      Component: () =>
        import('./pages/SettingsPage').then((mod) => ({
          default: mod.ProtectedSettingsPage,
        })),
    });
  },

  bootstrap(app: StrapiApp) {
    // In bootstrap, like i18n: its hook replaces `labelAction`, ours keeps the existing one
    app.registerHook('Admin/CM/pages/EditView/mutate-edit-view-layout', mutateEditViewHook);
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map((locale) =>
        import(`./translations/${locale}.json`)
          .then(({ default: data }) => ({
            data: prefixPluginTranslations(data, PLUGIN_ID),
            locale,
          }))
          .catch(() => ({ data: {}, locale }))
      )
    );
  },
};
