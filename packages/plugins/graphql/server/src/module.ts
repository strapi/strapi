import type { Core } from '@strapi/types';
import contentAPI from './services/content-api';
import typeRegistry from './services/type-registry';
import utils from './services/utils';
import constants from './services/constants';
import internals from './services/internals';
import builders from './services/builders';
import extension from './services/extension';
import format from './services/format';
import { services } from './services';

type PublicServices = {
  [K in keyof typeof services as `plugin::graphql.${K & string}`]: ReturnType<(typeof services)[K]>;
};

declare module '@strapi/types' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Public {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface Services extends PublicServices {}
  }
}

declare module '@strapi/types/dist/core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface Strapi {
    plugin(name: 'graphql'): Core.Plugin & {
      service(name: 'builders'): ReturnType<typeof builders>;
      service(name: 'content-api'): ReturnType<typeof contentAPI>;
      service(name: 'constants'): ReturnType<typeof constants>;
      service(name: 'extension'): ReturnType<typeof extension>;
      service(name: 'format'): ReturnType<typeof format>;
      service(name: 'internals'): ReturnType<typeof internals>;
      service(name: 'type-registry'): ReturnType<typeof typeRegistry>;
      service(name: 'utils'): ReturnType<typeof utils>;
    };
  }
}
