/* eslint-disable @typescript-eslint/no-var-requires */
import { register } from './register';
import { contentTypes } from './content-types';
import { services } from './services';
import { controllers } from './controllers';
import { routes } from './routes';
import { getService } from './utils';

const { features } = require('@strapi/strapi/dist/utils/ee');

const getPlugin = () => {
  if (
    features.isEnabled('cms-content-releases') &&
    strapi.features.future.isEnabled('contentReleases')
  ) {
    return {
      register,
      contentTypes,
      services,
      controllers,
      routes,
      destroy() {
        if (
          features.isEnabled('cms-content-releases') &&
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
