import { PLUGIN_ID, FEATURE_ID } from './constants';
import { Panel } from './routes/content-manager/[model]/[id]/components/Panel';
import { addColumnToTableHook } from './utils/cm-hooks';
import { prefixPluginTranslations } from './utils/translations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type { Plugin } from '@strapi/types';

const admin: Plugin.Config.AdminInput = {
  register(app: StrapiApp) {
    if (window.strapi.features.isEnabled(FEATURE_ID)) {
      app.registerHook('Admin/CM/pages/ListView/inject-column-in-table', addColumnToTableHook);

      const contentManagerPluginApis = app.getPlugin('content-manager').apis;

      if (
        'addEditViewSidePanel' in contentManagerPluginApis &&
        typeof contentManagerPluginApis.addEditViewSidePanel === 'function'
      ) {
        contentManagerPluginApis.addEditViewSidePanel([Panel]);
      }

      app.addSettingsLink('global', {
        id: PLUGIN_ID,
        to: `review-workflows`,
        intlLabel: {
          id: `${PLUGIN_ID}.plugin.name`,
          defaultMessage: 'Review Workflows',
        },
        permissions: [],
        async Component() {
          const { Router } = await import('./router');
          return { default: Router };
        },
      });
    } else if (!window.strapi.features.isEnabled(FEATURE_ID) && window.strapi?.flags?.promoteEE) {
      app.addSettingsLink('global', {
        id: PLUGIN_ID,
        to: `purchase-review-workflows`,
        intlLabel: {
          id: `${PLUGIN_ID}.plugin.name`,
          defaultMessage: 'Review Workflows',
        },
        licenseOnly: true,
        permissions: [],
        async Component() {
          const { PurchaseReviewWorkflows } = await import('./routes/purchase-review-workflows');
          return { default: PurchaseReviewWorkflows };
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
              data: prefixPluginTranslations(data, PLUGIN_ID),
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
