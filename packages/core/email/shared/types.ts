export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

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
