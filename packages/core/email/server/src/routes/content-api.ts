import type { Core } from '@strapi/types';
import { createContentApiRoutesFactory } from '@strapi/utils';
import { EmailRouteValidator } from './validation';

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
  ];
});

export default createRoutes;
