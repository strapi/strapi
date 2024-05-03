/* eslint-disable @typescript-eslint/no-var-requires */
import { register } from './register';
import { bootstrap } from './bootstrap';
import { destroy } from './destroy';
import { services } from './services';
import { controllers } from './controllers';
import { routes } from './routes';

const getPlugin = () => {
  if (strapi.ee.features.isEnabled('cms-content-releases')) {
    return {
      register,
      bootstrap,
      destroy,
      services,
      controllers,
      routes,
    };
  }

  return {
    // Always return register, it handles its own feature check
    register,
  };
};

export default getPlugin();
