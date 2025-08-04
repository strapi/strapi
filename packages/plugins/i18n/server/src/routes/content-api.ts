import type { Core } from '@strapi/types';
import { I18nLocaleRouteValidator } from './validation';

export default (): Core.RouterInput => {
  const validator = new I18nLocaleRouteValidator(strapi);

  return {
    type: 'content-api',
    routes: [
      {
        method: 'GET',
        path: '/locales',
        handler: 'locales.listLocales',
        response: validator.locales,
      },
    ],
  };
};
