export interface EmailSettings {
  config: ConfigSettings;
}

export interface ConfigSettings {
  provider: string;
  settings: {
    defaultFrom: string;
    defaultReplyTo: string;
  };
}
