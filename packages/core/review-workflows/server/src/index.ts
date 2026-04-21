import register from './register';
import contentTypes from './content-types';
import bootstrap from './bootstrap';
import destroy from './destroy';
import routes from './routes';
import services from './services';
import controllers from './controllers';

type ReviewWorkflowsPlugin = {
  register?: unknown;
  bootstrap?: unknown;
  destroy?: unknown;
  contentTypes: unknown;
  services?: unknown;
  controllers?: unknown;
  routes?: unknown;
};

const getPlugin = (): ReviewWorkflowsPlugin => {
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

const plugin: ReviewWorkflowsPlugin = getPlugin();

export default plugin;
