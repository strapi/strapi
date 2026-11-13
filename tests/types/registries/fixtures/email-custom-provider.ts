import type { Core } from '@strapi/strapi';
import type { EmailProvider } from '@strapi/email/strapi-server';

// An application whose provider has members of its own declares its type, extending the package
// contract to keep `send` and the optional members.
interface OutboxProvider extends EmailProvider {
  outboxPath(): string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppPluginProviders {
        email: OutboxProvider;
      }
    }
  }
}

declare const app: Core.Strapi;

const provider = app.plugin('email').provider;
provider satisfies OutboxProvider;
const outboxPath = provider.outboxPath();
outboxPath satisfies string;
const sent = provider.send({
  to: 'to@example.com',
  subject: 'Hi',
  text: 'Hi',
  headers: { 'X-Mailgun-Track': 'no' },
  attachments: [{ filename: 'report.txt', content: 'Report' }],
});
sent satisfies Promise<unknown>;
// @ts-expect-error The application contract has no arbitrary members.
provider.missing();

// The service contract does not change.
const service = app.plugin('email').service('email');
service.send({
  to: 'to@example.com',
  subject: 'Hi',
  text: 'Hi',
  headers: {},
}) satisfies Promise<unknown>;
