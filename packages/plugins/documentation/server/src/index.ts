import { bootstrap } from './bootstrap';
import { register } from './register';
import services from './services';
import routes from './routes';
import controllers from './controllers';
import { config } from './config';

export type * from './types';
export type * from './types/services';

export default {
  bootstrap,
  config,
  routes,
  controllers,
  register,
  services,
};
