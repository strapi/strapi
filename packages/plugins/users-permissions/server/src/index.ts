import register from './register';
import bootstrap from './bootstrap';
import contentTypes from './content-types';
import middlewares from './middlewares';
import services from './services';
import routes from './routes';
import controllers from './controllers';
import config from './config';

export default () => ({
  register,
  bootstrap,
  config,
  routes,
  controllers,
  contentTypes,
  middlewares,
  services,
});
