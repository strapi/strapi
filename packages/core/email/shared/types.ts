export interface ProviderCapabilities {
  transport?: {
    host?: string;
    port?: number;
    secure?: boolean;
    pool?: boolean;
    maxConnections?: number;
  };
  auth?: {
    type?: string;
    user?: string;
  };
  features?: string[];
}

export interface EmailSettings {
  config: ConfigSettings;
  supportsVerify: boolean;
  capabilities?: ProviderCapabilities;
  isIdle?: boolean;
}

export interface ConfigSettings {
  provider: string;
  settings: {
    defaultFrom: string;
    defaultReplyTo: string;
  };
}
