import bootstrap from './bootstrap';
import register from './register';
import contentTypes from './content-types/index';
import services from './services/index';
import routes from './routes/index';
import controllers from './controllers/index';
import config from './config/index';

export default () => ({
  register,
  bootstrap,
  routes,
  controllers,
  contentTypes,
  services,
  config,
});