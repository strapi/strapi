/* eslint-disable @typescript-eslint/no-var-requires */
import { register } from './register';
import { bootstrap } from './bootstrap';
import { contentTypes } from './content-types';
import { services } from './services';
import { controllers } from './controllers';
import { routes } from './routes';
import { getService } from './utils';

const getPlugin = () => {
  if (
    strapi.ee.features.isEnabled('cms-content-releases') &&
    strapi.features.future.isEnabled('contentReleases')
  ) {
    return {
      register,
      bootstrap,
      contentTypes,
      services,
      controllers,
      routes,
      destroy() {
        if (
          strapi.ee.features.isEnabled('cms-content-releases') &&
          strapi.features.future.isEnabled('contentReleases')
        ) {
          getService('event-manager').destroyAllListeners();
        }
      },
    };
  }

  // We keep returning contentTypes to avoid lost the data if feature is disabled
  return {
    contentTypes,
  };
};

export default getPlugin();
