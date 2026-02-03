import type { SESClientConfig } from '@aws-sdk/client-ses';

export interface SdkProviderOptions extends Partial<SESClientConfig> {
  region?: string;
}

// Legacy options (backwards compatibility with older versions of @strapi/provider-email-amazon-ses)
export interface LegacyProviderOptions {
  key: string;
  secret: string;
  amazon?: string;
}

export type ProviderOptions = LegacyProviderOptions | SdkProviderOptions;
