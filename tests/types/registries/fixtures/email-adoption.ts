import type { Core } from '@strapi/strapi';
import type { EmailService } from '@strapi/email/strapi-server';

declare const app: Core.Strapi;
declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

const email = app.plugin('email').service('email');
email satisfies EmailService;
const sent = email.send({ to: 'to@example.com', from: undefined, subject: 'Hi', text: 'Hi' });
sent satisfies Promise<unknown>;
// @ts-expect-error The result depends on the provider: sendmail resolves to `undefined`.
sent satisfies Promise<object>;
// @ts-expect-error An email has a recipient.
app.service('plugin::email.email').send({ subject: 'Hi', text: 'Hi' });

const templated = app
  .service('plugin::email.email')
  .sendTemplatedEmail(
    { to: 'to@example.com', replyTo: undefined },
    { subject: '<%= user.firstname %>', text: '<%= url %>', html: '<%= url %>' },
    { url: 'https://example.com', user: { firstname: 'Kai', username: null } }
  );
templated satisfies Promise<unknown>;
// @ts-expect-error Registered services have no arbitrary members.
email.missing();

const settings = email.getProviderSettings();
settings.provider satisfies string;

app.plugin('email').controller('email').send(context, next);
app.controller('plugin::email.email').getSettings(context, next);
// @ts-expect-error Registry controller actions do not accept misspelled names.
app.plugin('email').controller('email').verfy(context, next);

type Controllers = {
  email: Strapi.Registries.PackageControllers['plugin::email.email'];
};
({
  type: 'admin',
  routes: [{ method: 'POST', path: '/test', handler: 'email.test' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::email'>;
({
  type: 'admin',
  // @ts-expect-error Route actions are checked against the controller contracts.
  routes: [{ method: 'POST', path: '/test', handler: 'email.tset' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::email'>;
