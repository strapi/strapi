import { prefixPluginTranslations } from '@strapi/helper-plugin';
import { PaperPlane } from '@strapi/icons';

import { CMReleasesContainer } from './components/CMReleasesContainer';
import { PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { releaseApi } from './services/release';

import type { Plugin } from '@strapi/types';

// eslint-disable-next-line import/no-default-export
const admin: Plugin.Config.AdminInput = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(app: any) {
    if (window.strapi.features.isEnabled('cms-content-releases')) {
      app.addMenuLink({
        to: `/plugins/${pluginId}`,
        icon: PaperPlane,
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: 'Releases',
        },
        async Component() {
          const { App } = await import('./pages/App');
          return App;
        },
        permissions: PERMISSIONS.main,
      });

      /**
       * For some reason every middleware you pass has to a function
       * that returns the actual middleware. It's annoying but no one knows why....
       */
      app.addMiddlewares([() => releaseApi.middleware]);

      app.addReducers({
        [releaseApi.reducerPath]: releaseApi.reducer,
      });

      // Insert the Releases container in the 'right-links' zone of the Content Manager's edit view
      app.injectContentManagerComponent('editView', 'right-links', {
        name: `${pluginId}-link`,
        Component: CMReleasesContainer,
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
