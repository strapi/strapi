import bootstrap from './bootstrap';
import config from './config';
import register from './register';
import contentTypes from './content-types';
import services from './services';
import middlewares from './middlewares';
import controllers from './controllers';
import routes from './routes';

export default () => ({
  register,
  bootstrap,
  config,
  contentTypes,
  services,
  middlewares,
  controllers,
  routes,
});
