import type { Core } from '@strapi/types';
import { createContentApiRoutesFactory } from '@strapi/utils';
import type { Controllers } from '../types/controllers';
import { EmailRouteValidator } from './validation';

// The published type stays develop's `Core.RouterInput['routes']`; `satisfies` checks the literals.
const createRoutes = createContentApiRoutesFactory((): Core.RouterInput['routes'] => {
  const validator = new EmailRouteValidator(strapi);

  return [
    {
      method: 'POST',
      path: '/',
      handler: 'email.send',
      request: {
        body: { 'application/json': validator.sendEmailInput },
      },
      response: validator.emailResponse,
    },
  ] satisfies Core.RouterInputFor<Controllers, 'plugin::email'>['routes'];
});

export default createRoutes;
