import { omit } from 'lodash/fp';
import bootstrap from './bootstrap';
import register from './register';
import contentTypes from './content-types';
import services from './services';
import routes from './routes';
import controllers from './controllers';

const getPlugin = () => {
  if (strapi.ee.features.isEnabled('cms-ai') && strapi.config.get('admin.ai.enabled')) {
    return {
      register,
      bootstrap,
      routes,
      controllers,
      contentTypes,
      services,
    };
  }

  // Remove AI specific concerns if the app does not have AI
  const servicesWithoutAiLocalizations = omit(
    ['ai-localizations', 'ai-localization-jobs'],
    services
  );
  const routesWithoutAiLocalizations = routes.admin.routes.filter(
    (route) => !route.handler.startsWith('ai-localization')
  );
  const controllersWithoutAiLocalizations = omit(['ai-localization-jobs'], controllers);

  return {
    // Always return register and bootstrap they handle their own feature check
    register,
    bootstrap,
    contentTypes,
    routes: routesWithoutAiLocalizations,
    controllers: controllersWithoutAiLocalizations,
    services: servicesWithoutAiLocalizations,
  };
};

export default getPlugin();
