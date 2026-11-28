/**
 * Every provider Better Auth 1.7 ships, as definitions: its 36 social providers
 * (`socialProviders` in `@better-auth/core`) and its 10 generic OAuth presets (`better-auth/plugins/
 * generic-oauth`). Nothing is installed for them.
 *
 * This file imports nothing from Better Auth at run time: it is loaded with the plugin, and Better
 * Auth (ESM only) is loaded lazily by the engine. A generic OAuth preset is therefore data: its
 * `init` answers `{ strapiPreset: { name, options } }`, and the engine (`engine/better-auth/
 * presets.ts`) calls Better Auth's preset of that name when it builds its options.
 *
 * Better Auth has no field schema, only options, so each definition declares the options it takes
 * besides the client id, the secret and the scopes. `social()` below makes `tsc` fail when
 * Better Auth's options type of a provider requires one that is not declared here, which is what an
 * upgrade that adds a required option looks like.
 *
 * The preset ids are Better Auth's own, except `slack` and `line`: social providers of the same
 * name exist, and an id names one provider, so the presets are `slack-oidc` and `line-oidc`.
 */
import type { socialProviders } from '@better-auth/core/social-providers';
import { createDefinition } from './define-provider';
import type {
  ProviderClaim,
  ProviderDefinition,
  ProviderField,
  ProviderInitOptions,
} from './define-provider';

type Social = typeof socialProviders;
export type SocialProviderId = keyof Social;
type SocialOptions<K extends SocialProviderId> = Parameters<Social[K]>[0];

type RequiredKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [P in keyof T]-?: {} extends Pick<T, P> ? never : P;
}[keyof T];

/**
 * The options a social provider's Better Auth type requires besides the credentials. TikTok's
 * `clientKey` is its client id.
 */
export type RequiredExtras<K extends SocialProviderId> = Exclude<
  RequiredKeys<SocialOptions<K>>,
  'clientId' | 'clientSecret' | 'clientKey'
>;

type Fields = Record<string, ProviderField>;

type SocialSpec<K extends SocialProviderId> = {
  name: string;
  claims?: Record<string, ProviderClaim>;
} & ([RequiredExtras<K>] extends [never]
  ? { fields?: Fields }
  : { fields: Record<RequiredExtras<K>, ProviderField> & Fields });

/** Better Auth's option that holds the client id: TikTok calls it the client key. */
const CLIENT_ID_OPTION: Partial<Record<SocialProviderId, string>> = { tiktok: 'clientKey' };

const social = <K extends SocialProviderId>(id: K, spec: SocialSpec<K>): ProviderDefinition =>
  createDefinition('social', {
    id,
    name: spec.name,
    fields: spec.fields,
    claims: spec.claims,
    init: ({ clientId, clientSecret, scopes, ...rest }) => ({
      ...rest,
      [CLIENT_ID_OPTION[id] ?? 'clientId']: clientId,
      clientSecret,
      ...(scopes.length > 0 ? { scope: scopes } : {}),
    }),
  });

/** The names of Better Auth's generic OAuth presets, as `better-auth/plugins` exports them. */
export type PresetName =
  | 'auth0'
  | 'gumroad'
  | 'hubspot'
  | 'keycloak'
  | 'line'
  | 'microsoftEntraId'
  | 'okta'
  | 'patreon'
  | 'slack'
  | 'yandex';

/** What a preset's `init` answers; the engine turns it into the preset's own config. */
export interface PresetInit {
  strapiPreset: { name: PresetName; options: Record<string, unknown> };
}

/** A generic OAuth preset; its own `providerId` is dropped by the engine, the definition's id stands for it. */
const preset = (
  id: string,
  name: string,
  presetName: PresetName,
  map: (options: ProviderInitOptions) => Record<string, unknown> = (options) => options,
  extra: { fields?: Fields; defaultScopes?: string[] } = {}
): ProviderDefinition =>
  createDefinition('oauth', {
    id,
    name,
    ...extra,
    init({ scopes, ...rest }): PresetInit {
      return {
        strapiPreset: {
          name: presetName,
          options: map({
            ...(rest as ProviderInitOptions),
            ...(scopes.length > 0 ? { scopes } : {}),
          } as ProviderInitOptions),
        },
      };
    },
  });

const text = (label: string, extra: Partial<ProviderField> = {}): ProviderField => ({
  type: 'string',
  label,
  ...extra,
});

const url = (label: string, extra: Partial<ProviderField> = {}): ProviderField => ({
  type: 'url',
  label,
  ...extra,
});

const select = (
  label: string,
  options: string[],
  extra: Partial<ProviderField> = {}
): ProviderField => ({
  type: 'select',
  label,
  options,
  ...extra,
});

const string = (label: string): ProviderClaim => ({ type: 'string', label });
const number = (label: string): ProviderClaim => ({ type: 'number', label });
const boolean = (label: string): ProviderClaim => ({ type: 'boolean', label });

/** The 36 social providers. A new one in Better Auth fails the test that lists them. */
const SOCIAL: ProviderDefinition[] = [
  social('apple', {
    name: 'Apple',
    fields: {
      appBundleIdentifier: text('App bundle identifier', {
        hint: 'The bundle identifier of a native iOS app, to sign in with an Apple ID token.',
      }),
    },
  }),
  social('atlassian', { name: 'Atlassian' }),
  social('cloudflare', { name: 'Cloudflare' }),
  social('cognito', {
    name: 'Amazon Cognito',
    fields: {
      domain: text('Domain', {
        required: true,
        hint: 'The user pool domain, such as your-app.auth.us-east-1.amazoncognito.com.',
      }),
      region: text('Region', {
        required: true,
        hint: 'The AWS region of the user pool, such as us-east-1.',
      }),
      userPoolId: text('User pool ID', { required: true }),
    },
  }),
  social('discord', {
    name: 'Discord',
    claims: {
      username: string('Username'),
      locale: string('Locale'),
      verified: boolean('Verified'),
    },
  }),
  social('facebook', { name: 'Facebook', fields: { configId: text('Configuration ID') } }),
  social('figma', { name: 'Figma' }),
  social('github', {
    name: 'GitHub',
    claims: {
      login: string('Username'),
      company: string('Company'),
      location: string('Location'),
      bio: string('Bio'),
      blog: string('Website'),
      public_repos: number('Public repositories'),
    },
  }),
  social('microsoft', {
    name: 'Microsoft',
    fields: {
      tenantId: text('Tenant ID', {
        hint: 'A tenant ID, or common, organizations or consumers. Empty is common.',
      }),
    },
  }),
  social('google', {
    name: 'Google',
    claims: { locale: string('Locale'), hd: string('Google Workspace domain') },
  }),
  social('huggingface', { name: 'Hugging Face' }),
  social('slack', { name: 'Slack' }),
  social('spotify', { name: 'Spotify' }),
  social('twitch', { name: 'Twitch' }),
  social('twitter', { name: 'X (Twitter)' }),
  social('dropbox', { name: 'Dropbox' }),
  social('kick', { name: 'Kick' }),
  social('linear', { name: 'Linear' }),
  social('linkedin', { name: 'LinkedIn' }),
  social('gitlab', {
    name: 'GitLab',
    fields: {
      issuer: url('Instance URL', { hint: 'For a self-managed GitLab. Empty is gitlab.com.' }),
    },
    claims: {
      username: string('Username'),
      organization: string('Organization'),
      job_title: string('Job title'),
      location: string('Location'),
      bio: string('Bio'),
    },
  }),
  social('tiktok', { name: 'TikTok' }),
  social('reddit', { name: 'Reddit' }),
  social('roblox', { name: 'Roblox' }),
  social('salesforce', {
    name: 'Salesforce',
    fields: {
      environment: select('Environment', ['production', 'sandbox']),
      loginUrl: url('Login URL', { hint: 'A My Domain URL. Empty uses the environment.' }),
    },
  }),
  social('vk', { name: 'VK', fields: { scheme: select('Color scheme', ['light', 'dark']) } }),
  social('zoom', { name: 'Zoom' }),
  social('notion', { name: 'Notion' }),
  social('kakao', { name: 'Kakao' }),
  social('naver', { name: 'Naver' }),
  social('line', { name: 'LINE' }),
  social('paybin', {
    name: 'Paybin',
    fields: { issuer: url('Issuer URL') },
  }),
  social('paypal', {
    name: 'PayPal',
    fields: { environment: select('Environment', ['live', 'sandbox']) },
  }),
  social('polar', { name: 'Polar' }),
  social('railway', { name: 'Railway' }),
  social('vercel', { name: 'Vercel' }),
  social('wechat', { name: 'WeChat', fields: { lang: select('Language', ['cn', 'en']) } }),
];

/** The 10 generic OAuth presets. */
const PRESETS: ProviderDefinition[] = [
  preset(
    'auth0',
    'Auth0',
    'auth0',
    (o) => ({
      clientId: o.clientId,
      clientSecret: o.clientSecret,
      scopes: o.scopes,
      domain: o.domain as string,
    }),
    {
      fields: {
        domain: text('Domain', {
          required: true,
          hint: 'Your Auth0 domain, such as dev-xxx.eu.auth0.com.',
        }),
      },
      defaultScopes: ['openid', 'profile', 'email'],
    }
  ),
  preset('gumroad', 'Gumroad', 'gumroad', undefined, { defaultScopes: ['view_profile'] }),
  preset('hubspot', 'HubSpot', 'hubspot', undefined, { defaultScopes: ['oauth'] }),
  preset('keycloak', 'Keycloak', 'keycloak', (o) => ({ ...o, issuer: o.issuer as string }), {
    fields: {
      issuer: url('Issuer URL', {
        required: true,
        hint: 'The realm URL, such as https://my-domain/realms/MyRealm.',
      }),
    },
    defaultScopes: ['openid', 'profile', 'email'],
  }),
  preset('line-oidc', 'LINE', 'line', undefined, { defaultScopes: ['openid', 'profile', 'email'] }),
  preset(
    'microsoft-entra-id',
    'Microsoft Entra ID',
    'microsoftEntraId',
    (o) => ({ ...o, tenantId: o.tenantId as string }),
    {
      fields: {
        tenantId: text('Tenant ID', {
          required: true,
          hint: 'The GUID of one tenant. For common, organizations or consumers use the Microsoft social provider.',
        }),
      },
    }
  ),
  preset('okta', 'Okta', 'okta', (o) => ({ ...o, issuer: o.issuer as string }), {
    fields: {
      issuer: url('Issuer URL', {
        required: true,
        hint: 'Your Okta issuer, such as https://dev-xxxxx.okta.com/oauth2/default.',
      }),
    },
    defaultScopes: ['openid', 'profile', 'email'],
  }),
  preset('patreon', 'Patreon', 'patreon'),
  preset('slack-oidc', 'Slack (OpenID Connect)', 'slack', undefined, {
    defaultScopes: ['openid', 'profile', 'email'],
  }),
  preset('yandex', 'Yandex', 'yandex'),
];

export const BUILT_IN_PROVIDERS: readonly ProviderDefinition[] = [...SOCIAL, ...PRESETS];
