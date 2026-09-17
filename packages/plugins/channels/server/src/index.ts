import bootstrap from './bootstrap';
import register from './register';
import contentTypes from './content-types';
import services from './services';
import middlewares from './middlewares';
import controllers from './controllers';
import routes from './routes';

export default () => ({
  register,
  bootstrap,
  contentTypes,
  services,
  middlewares,
  controllers,
  routes,
});
