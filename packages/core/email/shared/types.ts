export interface EmailSettings {
  config: ConfigSettings;
  supportsVerify: boolean;
}

export interface ConfigSettings {
  provider: string;
  settings: {
    defaultFrom: string;
    defaultReplyTo: string;
  };
}
