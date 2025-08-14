import type { Core } from '@strapi/types';
import { EmailRouteValidator } from './validation';

export default (): Core.RouterInput => {
  const validator = new EmailRouteValidator(strapi);

  return {
    type: 'content-api',
    routes: [
      {
        method: 'POST',
        path: '/',
        handler: 'email.send',
        request: {
          body: { 'application/json': validator.sendEmailInput },
        },
        response: validator.emailResponse,
      },
    ],
  };
};
