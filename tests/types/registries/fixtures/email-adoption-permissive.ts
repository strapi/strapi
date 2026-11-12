import type { Core } from '@strapi/strapi';
import type {} from '@strapi/email/strapi-server';

declare const app: Core.Strapi;

// Loading the Email contracts does not opt applications into strictness: lookups keep develop's
// permissive service and controller types.
const email = app.plugin('email').service('email');
email.send({ subject: 3 }).anything();
email.sendTemplatedEmail({}, {}, 'data');
app.service('plugin::email.email').missing();
app
  .plugin('email')
  .controller('email')
  .unknownAction?.({} as never, async () => {});
({
  type: 'admin',
  routes: [{ method: 'POST', path: '/test', handler: 'email.tset' }],
}) satisfies Core.RouterInput;
