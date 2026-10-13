import type { Core } from '@strapi/types';
import { createContentApiRoutesFactory } from '@strapi/utils';
import type { Controllers } from '../types/controllers';
import { I18nLocaleRouteValidator } from './validation';

// The published type stays develop's `Core.RouterInput['routes']`; `satisfies` checks the literals.
const createContentApiRoutes = createContentApiRoutesFactory((): Core.RouterInput['routes'] => {
  const validator = new I18nLocaleRouteValidator(strapi);
  return [
    {
      method: 'GET',
      path: '/locales',
      handler: 'locales.listLocales',
      response: validator.locales,
    },
  ] satisfies Core.RouterInputFor<Controllers, 'plugin::i18n'>['routes'];
});

export default createContentApiRoutes;
