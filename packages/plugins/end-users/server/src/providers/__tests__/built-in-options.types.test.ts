/**
 * A type test, checked by `tsc` (it has no runtime): the options each built-in's Better Auth options
 * type requires besides the credentials. `built-in.ts` makes every one of them a declared field, so
 * a Better Auth upgrade that adds a required option fails here (and there) instead of reaching a
 * project as a provider that cannot be configured.
 */
import type {
  Auth0Options,
  GumroadOptions,
  HubSpotOptions,
  KeycloakOptions,
  LineOptions,
  MicrosoftEntraIdOptions,
  OktaOptions,
  PatreonOptions,
  SlackOptions,
  YandexOptions,
} from 'better-auth/plugins/generic-oauth';

import type { RequiredExtras, SocialProviderId } from '../built-in';

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type SocialExtras = { [K in SocialProviderId]: RequiredExtras<K> };

export const social: Equal<
  SocialExtras,
  {
    apple: never;
    atlassian: never;
    cloudflare: never;
    cognito: 'domain' | 'region' | 'userPoolId';
    discord: never;
    facebook: never;
    figma: never;
    github: never;
    microsoft: never;
    google: never;
    huggingface: never;
    slack: never;
    spotify: never;
    twitch: never;
    twitter: never;
    dropbox: never;
    kick: never;
    linear: never;
    linkedin: never;
    gitlab: never;
    tiktok: never;
    reddit: never;
    roblox: never;
    salesforce: never;
    vk: never;
    zoom: never;
    notion: never;
    kakao: never;
    naver: never;
    line: never;
    paybin: never;
    paypal: never;
    polar: never;
    railway: never;
    vercel: never;
    wechat: never;
  }
> = true;

type Required<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [P in keyof T]-?: {} extends Pick<T, P> ? never : P;
}[keyof T];

type PresetExtras<T> = Exclude<Required<T>, 'clientId'>;

export const auth0: Equal<PresetExtras<Auth0Options>, 'domain'> = true;
export const keycloak: Equal<PresetExtras<KeycloakOptions>, 'issuer'> = true;
export const okta: Equal<PresetExtras<OktaOptions>, 'issuer'> = true;
export const entra: Equal<PresetExtras<MicrosoftEntraIdOptions>, 'tenantId'> = true;

export const noExtras: [
  PresetExtras<GumroadOptions>,
  PresetExtras<HubSpotOptions>,
  PresetExtras<LineOptions>,
  PresetExtras<PatreonOptions>,
  PresetExtras<SlackOptions>,
  PresetExtras<YandexOptions>,
] extends [never, never, never, never, never, never]
  ? true
  : false = true;
