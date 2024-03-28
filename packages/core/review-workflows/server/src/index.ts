import register from './register';
import contentTypes from './content-types';
import bootstrap from './bootstrap';
import destroy from './destroy';
import routes from './routes';
import services from './services';
import controllers from './controllers';

const getPlugin = () => {
  if (strapi.ee.features.isEnabled('review-workflows')) {
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
    // Always return contentTypes to avoid losing data when the feature is disabled
    // or downgrading the license
    contentTypes,
  };
};

export default getPlugin();
