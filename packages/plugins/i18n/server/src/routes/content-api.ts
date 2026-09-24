import type { Core } from '@strapi/types';
import { createContentApiRoutesFactory } from '@strapi/utils';
import type controllers from '../controllers';
import { I18nLocaleRouteValidator } from './validation';

const createContentApiRoutes = createContentApiRoutesFactory(
  (): Core.RouterInputFor<typeof controllers, 'plugin::i18n'>['routes'] => {
    const validator = new I18nLocaleRouteValidator(strapi);
    return [
      {
        method: 'GET',
        path: '/locales',
        handler: 'locales.listLocales',
        response: validator.locales,
      },
    ];
  }
);

export default createContentApiRoutes;
