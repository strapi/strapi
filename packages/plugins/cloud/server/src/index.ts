import { type Core } from '@strapi/types';
import { routes } from './routes';
import { services } from './services';

const CLOUD_API = 'https://platform-api-jimi.tunnel.cloud.strapi.team';

export default () =>
  ({
    async register({ strapi }) {
      console.log('registering cloud plugin');

      // Intercept the admin user creation to also register the user on the cloud if they opted in
      strapi.server.use(async (ctx, next) => {
        await next();
        if (ctx.path === '/admin/register-admin') {
          const { email, password, registerCloud, firstname } = ctx.request.body as any;

          if (registerCloud) {
            // Register the user on the cloud
            const response = await fetch(`${CLOUD_API}/auth/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password, firstname }),
            });
            const { token } = await response.json();
            ctx.state.cloudUser = { token };
          }
        }
      });
    },
    routes,
    services,
  }) as Partial<Core.Plugin>;
