// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type { Controllers } from './controllers';

declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

const email = strapi.plugin('email').service('email');

// Unset settings are passed as they are read.
const sent = email.send({
  to: 'to@example.com',
  from: undefined,
  replyTo: undefined,
  subject: 'Subject',
  text: 'Text',
});
sent satisfies Promise<unknown>;
// @ts-expect-error The result depends on the provider: sendmail resolves to `undefined`.
sent satisfies Promise<object>;
// @ts-expect-error An email has a subject.
email.send({ to: 'to@example.com', text: 'Text' });

email.sendTemplatedEmail(
  { to: 'to@example.com', from: undefined },
  { subject: 'Hello <%= user.firstname %>', text: '<%= url %>', html: '<%= url %>' },
  { url: 'https://example.com', user: { firstname: 'Kai', username: null } }
) satisfies Promise<unknown>;
email.sendTemplatedEmail(
  { to: 'to@example.com' },
  { subject: 'Subject', text: 'Text', html: '' },
  // @ts-expect-error Template data is an object of values.
  'data'
);

email.getProviderSettings().provider satisfies string;
// @ts-expect-error Registered services have no arbitrary members.
email.missing();

strapi.controller('plugin::email.email').verify(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('email').controller('email').missing(context, next);

({
  type: 'admin',
  routes: [{ method: 'GET', path: '/settings', handler: 'email.getSettings' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::email'>;
({
  type: 'admin',
  // @ts-expect-error Route actions are checked against the controller contracts.
  routes: [{ method: 'GET', path: '/settings', handler: 'email.getSetting' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::email'>;
