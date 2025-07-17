import { CheckCircle, Feather, Pencil, PuzzlePiece } from '@strapi/icons';

import { PLUGIN_ID } from './constants/plugin';
import { ContentManagerPlugin } from './content-manager';
import { historyAdmin } from './history';
import { reducer } from './modules/reducers';
import { previewAdmin } from './preview';
import { routes } from './router';
import { prefixPluginTranslations } from './utils/translations';

// NOTE: we have to preload it to ensure chunks will have it available as global
import 'prismjs';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: any) {
    const cm = new ContentManagerPlugin();

    app.addReducers({
      [PLUGIN_ID]: reducer,
    });

    app.addMenuLink({
      to: PLUGIN_ID,
      icon: Feather,
      intlLabel: {
        id: `content-manager.plugin.name`,
        defaultMessage: 'Content Manager',
      },
      permissions: [],
      position: 1,
    });

    app.router.addRoute({
      path: 'content-manager/*',
      lazy: async () => {
        const { Layout } = await import('./layout');

        return {
          Component: Layout,
        };
      },
      children: routes,
    });

    app.registerPlugin(cm.config);

    // Register homepage widgets
    app.widgets.register([
      {
        icon: PuzzlePiece,
        title: {
          id: `${PLUGIN_ID}.widget.chart-entries.title`,
          defaultMessage: 'Entries',
        },
        component: async () => {
          const { ChartEntriesWidget } = await import('./components/Widgets');
          return ChartEntriesWidget;
        },
        pluginId: PLUGIN_ID,
        id: 'chart-entries',
        permissions: [{ action: 'plugin::content-manager.explorer.read' }],
      },
      {
        icon: Pencil,
        title: {
          id: `${PLUGIN_ID}.widget.last-edited.title`,
          defaultMessage: 'Last edited entries',
        },
        component: async () => {
          const { LastEditedWidget } = await import('./components/Widgets');
          return LastEditedWidget;
        },
        pluginId: PLUGIN_ID,
        id: 'last-edited-entries',
        permissions: [{ action: 'plugin::content-manager.explorer.read' }],
      },
      {
        icon: CheckCircle,
        title: {
          id: `${PLUGIN_ID}.widget.last-published.title`,
          defaultMessage: 'Last published entries',
        },
        component: async () => {
          const { LastPublishedWidget } = await import('./components/Widgets');
          return LastPublishedWidget;
        },
        pluginId: PLUGIN_ID,
        id: 'last-published-entries',
        permissions: [{ action: 'plugin::content-manager.explorer.read' }],
      },
    ]);
  },
  bootstrap(app: any) {
    if (typeof historyAdmin.bootstrap === 'function') {
      historyAdmin.bootstrap(app);
    }
    if (typeof previewAdmin.bootstrap === 'function') {
      previewAdmin.bootstrap(app);
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

export * from './exports';
