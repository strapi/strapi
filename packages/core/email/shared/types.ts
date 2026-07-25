import type { Providers } from '@strapi/types';

export interface EmailSettings {
  config: ConfigSettings;
  supportsVerify: boolean;
  capabilities?: Providers.Email.Capabilities;
  isIdle?: boolean;
}

export interface ConfigSettings {
  provider: string;
  settings: Providers.Email.Settings;
}
