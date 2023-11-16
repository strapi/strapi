import bootstrap from './bootstrap';
import routes from './routes';
import policies from './policies';
import controllers from './controllers';
import services from './services';

export default () => {
  return {
    bootstrap,
    controllers,
    routes,
    policies,
    services,
  };
};
