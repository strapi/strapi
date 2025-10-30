import bootstrap from './bootstrap';
import register from './register';
import routes from './routes';
import controllers from './controllers';
import services from './services';
import contentTypes from './content-types';
import { config } from './config';

export default () => ({
  bootstrap,
  register,
  routes,
  controllers,
  services,
  contentTypes,
  config,
}) as any;



