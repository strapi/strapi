/**
 * Type-level regression tests for `factories.createEmailProvider`, compiled by `yarn test:ts`
 * (tsc -p tsconfig.json) and excluded from the build. Each block must compile; `@ts-expect-error`
 * marks the providers that must keep failing.
 *
 * The contract itself, checked with `satisfies`, is tested in @strapi/types
 * (src/providers/__tests__/email.test.ts).
 */
import type { Providers } from '@strapi/types';

import { createEmailProvider } from '../factories';

type Assert<T extends true> = T;
type IsEqual<Left, Right> = (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right
  ? 1
  : 2
  ? true
  : false;

// An application provider: options, settings and send options are typed by the contract, extra
// members are kept.
export const appProvider = createEmailProvider({
  name: 'test',
  init: (options: { url: string }, settings) => ({
    async send(email) {
      email.subject satisfies string;

      return `${options.url}?from=${settings.defaultFrom}`;
    },
    outbox(): string {
      return 'outbox';
    },
  }),
});

true satisfies Assert<IsEqual<Parameters<typeof appProvider.init>[0], { url: string }>>;
true satisfies Assert<IsEqual<ReturnType<ReturnType<typeof appProvider.init>['outbox']>, string>>;

// Without an annotation, the options are the `providerOptions` record of the email config.
export const untypedOptionsProvider = createEmailProvider({
  name: 'test',
  init(options, settings) {
    true satisfies Assert<IsEqual<typeof options, Record<string, unknown>>>;
    true satisfies Assert<IsEqual<typeof settings, Providers.Email.Settings>>;

    return { send: () => Promise.resolve() };
  },
});

// Options typed with an interface, as the bundled providers declare theirs, or with an inline type.
interface ApiOptions {
  apiKey: string;
  region?: string;
}

const interfaceOptionsModule = {
  name: 'test',
  init: (options: ApiOptions) => ({ send: () => Promise.resolve(), apiKey: () => options.apiKey }),
};

export const interfaceOptionsProvider = createEmailProvider(interfaceOptionsModule);

true satisfies Assert<IsEqual<Parameters<typeof interfaceOptionsProvider.init>[0], ApiOptions>>;

export const interfaceOptionsLiteralProvider = createEmailProvider({
  name: 'test',
  init: (options: ApiOptions) => ({ send: () => Promise.resolve(), apiKey: () => options.apiKey }),
});

// A module checked with `satisfies` can also go through the helper, and `init` keeps its own
// signature.
export const inlineOptionsModule = {
  name: 'test',
  init: (options: { url: string }) => ({ send: () => Promise.resolve(), url: () => options.url }),
} satisfies Providers.Email.Factory<{ url: string }>;

createEmailProvider(inlineOptionsModule).init({ url: '/' }).url() satisfies string;

// An explicit type argument is the module type, and keeps its members outside the contract.
type QueueModule = {
  name: 'test',
  init(
    options: { queue: string },
    settings: Providers.Email.Settings
  ): Providers.Email.Provider & { queueName(): string };
};

export const explicitModuleProvider = createEmailProvider<QueueModule>({
  name: 'test',
  init: (options) => ({ send: () => Promise.resolve(), queueName: () => options.queue }),
});

explicitModuleProvider
  .init({ queue: 'mail' }, { defaultFrom: 'no-reply@strapi.io' })
  .queueName() satisfies string;

// The module may carry members besides `name` and `init`.
export const namedProvider = createEmailProvider({
  name: 'api',
  provider: 'api',
  init: () => ({ send: () => Promise.resolve() }),
});

namedProvider.name satisfies string;

// @ts-expect-error a provider module must export its `name`.
createEmailProvider({
  init: () => ({ send: () => Promise.resolve() }),
});

createEmailProvider({
  name: 'test',
  // @ts-expect-error a provider must implement `send`.
  init: () => ({ verify: async () => true }),
});

createEmailProvider({
  name: 'test',
  // @ts-expect-error `send` must answer a promise.
  init: () => ({ send: () => 'sent' }),
});

createEmailProvider({
  name: 'test',
  // @ts-expect-error `send` must accept the options the plugin passes.
  init: () => ({ send: async (email: { to: number }) => email.to }),
});

createEmailProvider({
  name: 'test',
  // @ts-expect-error `init` cannot require more from `settings` than the plugin passes.
  init: (_options: ApiOptions, settings: { defaultFrom: string; apiKey: string }) => ({
    send: async () => settings.apiKey,
  }),
});

createEmailProvider({
  name: 'test',
  // @ts-expect-error `init` receives the `providerOptions` record, not a primitive.
  init: (options: number) => ({ send: async () => options }),
});
