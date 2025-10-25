import register from './register';
import bootstrap from './bootstrap';
import destroy from './destroy';
import routes from './routes';
import policies from './policies';
import controllers from './controllers';
import services from './services';
import contentTypes from './content-types';
import config from './config/default';

export default () => {
  return {
    register,
    bootstrap,
    destroy,
    controllers,
    routes,
    policies,
    services,
    contentTypes,
    config,
  };
};
