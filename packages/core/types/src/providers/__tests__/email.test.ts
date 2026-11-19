/**
 * Type-level tests of the email provider contract, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * Each block must compile; `@ts-expect-error` marks the providers that must keep failing.
 *
 * Modules are checked with `satisfies`, the way provider packages check theirs. The bundled
 * providers (`@strapi/provider-email-nodemailer`, `-sendmail`, …) check their own module in their
 * sources, since `@strapi/types` cannot depend on them. The application helper,
 * `factories.createEmailProvider`, is tested in @strapi/core (src/__type-tests__/email-provider.test.ts).
 */
import { expectTypeOf } from 'vitest';

import type { Providers } from '../..';

// A provider on the object literal: options, settings and send options are typed by the contract.
export const appProvider = {
  name: 'test',
  init: (options: { url: string }, settings) => ({
    async send(email) {
      expectTypeOf(email.to).toEqualTypeOf<string>();
      expectTypeOf(settings.defaultFrom).toEqualTypeOf<string>();

      return `${options.url}/${email.subject}`;
    },
    async verify() {
      return true;
    },
    isIdle: () => true,
    close() {},
    getCapabilities: () => ({ features: ['html'] }),
    outbox(): string {
      return 'outbox';
    },
  }),
} satisfies Providers.Email.Factory<{ url: string }>;

// Without a type argument, the options are the `providerOptions` record of the email config.
export const untypedOptionsProvider = {
  name: 'test',
  init(options, settings) {
    expectTypeOf(options).toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf(settings).toEqualTypeOf<Providers.Email.Settings>();

    return { send: () => Promise.resolve() };
  },
} satisfies Providers.Email.Factory;

// Options typed with an interface, as the bundled providers declare theirs.
interface ApiOptions {
  apiKey: string;
  region?: string;
}

export const interfaceOptionsProvider = {
  name: 'test',
  init: (options: ApiOptions) => ({ send: async () => options.apiKey }),
} satisfies Providers.Email.Factory<ApiOptions>;

// The module may carry members besides `name` and `init`.
export const namedProvider = {
  name: 'api',
  provider: 'api',
  init: () => ({ send: () => Promise.resolve() }),
} satisfies Providers.Email.Factory;

// A provider may accept wider send options than the plugin passes.
export const widerSendOptionsProvider = {
  name: 'test',
  init: () => ({
    send: async (email: { to: string | string[]; templateId?: number }) => email.to,
  }),
} satisfies Providers.Email.Factory;

// A provider may type its settings more loosely than the plugin passes them.
export const widerSettingsProvider = {
  name: 'test',
  init: (
    _options: ApiOptions,
    settings: { defaultFrom?: string; defaultReplyTo?: string[] | string }
  ) => ({
    send: async () => settings.defaultFrom,
  }),
} satisfies Providers.Email.Factory<ApiOptions>;

// @ts-expect-error a provider module must export its `name`.
export const missingName: Providers.Email.Factory = {
  init: () => ({ send: () => Promise.resolve() }),
};

export const missingSend = {
  name: 'test',
  // @ts-expect-error a provider must implement `send`.
  init: () => ({ verify: async () => true }),
} satisfies Providers.Email.Factory;

export const syncSend = {
  name: 'test',
  // @ts-expect-error `send` must answer a promise.
  init: () => ({ send: () => 'sent' }),
} satisfies Providers.Email.Factory;

export const narrowerSendOptions = {
  name: 'test',
  // @ts-expect-error `send` must accept the options the plugin passes.
  init: () => ({ send: async (email: { to: number }) => email.to }),
} satisfies Providers.Email.Factory;

export const stringIsIdle = {
  name: 'test',
  // @ts-expect-error `isIdle` must answer a boolean.
  init: () => ({ send: () => Promise.resolve(), isIdle: () => 'yes' }),
} satisfies Providers.Email.Factory;

export const stringCapabilities = {
  name: 'test',
  // @ts-expect-error `getCapabilities` must answer the capabilities object.
  init: () => ({ send: () => Promise.resolve(), getCapabilities: () => 'smtp' }),
} satisfies Providers.Email.Factory;

export const narrowerSettings = {
  name: 'test',
  // @ts-expect-error `init` cannot require more from `settings` than the plugin passes.
  init: (_options: ApiOptions, settings: { defaultFrom: string; apiKey: string }) => ({
    send: async () => settings.apiKey,
  }),
} satisfies Providers.Email.Factory<ApiOptions>;

export const interfaceWithoutTypeArgument = {
  name: 'test',
  // @ts-expect-error without a type argument, `init` must accept the `providerOptions` record.
  init: (options: ApiOptions) => ({ send: async () => options.apiKey }),
} satisfies Providers.Email.Factory;
