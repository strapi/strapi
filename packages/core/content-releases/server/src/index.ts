/* eslint-disable @typescript-eslint/no-var-requires */
import { register } from './register';
import { bootstrap } from './bootstrap';
import { destroy } from './destroy';
import { contentTypes } from './content-types';
import { services } from './services';
import { controllers } from './controllers';
import { routes } from './routes';

const getPlugin = () => {
  if (strapi.ee.features.isEnabled('cms-content-releases')) {
    return {
      register,
      bootstrap,
      destroy,
      contentTypes,
      services,
      controllers,
      routes,
    };
  }

  return {
    // Always return register, it handles its own feature check
    register,
    // Always return contentTypes to avoid losing data when the feature is disabled
    contentTypes,
  };
};

export default getPlugin();
