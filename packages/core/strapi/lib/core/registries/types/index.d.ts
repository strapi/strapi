import { default as apisRegistry } from '../apis';
import { default as configRegistry } from '../config';
import { default as contentTypesRegistry } from '../content-types';
import { default as controllersRegistry } from '../controllers';
import { default as hooksRegistry } from '../hooks';
import { default as middlewaresRegistry } from '../middlewares';
import { default as modulesRegistry } from '../modules';
import { default as pluginsRegistry } from '../plugins';
import { default as policiesRegistry } from '../policies';
import { default as servicesRegistry } from '../services';
import { default as authService } from '../../../services/auth';

export interface StrapiCoreRegistries {
  apis: ReturnType<typeof apisRegistry>;
  config: ReturnType<typeof configRegistry>;
  'content-types': ReturnType<typeof contentTypesRegistry>;
  controllers: ReturnType<typeof controllersRegistry>;
  hooks: ReturnType<typeof hooksRegistry>;
  middlewares: ReturnType<typeof middlewaresRegistry>;
  modules: ReturnType<typeof modulesRegistry>;
  plugins: ReturnType<typeof pluginsRegistry>;
  policies: ReturnType<typeof policiesRegistry>;
  services: ReturnType<typeof servicesRegistry>;
  auth: ReturnType<typeof authService>;
}
