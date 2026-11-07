/**
 * `@strapi/plugin-end-users/providers`: what a provider package imports, so that it never imports
 * `better-auth` itself.
 */
export { defineProvider } from './define-provider';
export type {
  ProviderClaim,
  ProviderDefinition,
  ProviderEntry,
  ProviderField,
  ProviderInitOptions,
} from './define-provider';
