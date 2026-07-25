export interface Factory {
  init(options: object | undefined, settings: Settings | undefined): Provider;
}

export interface Provider {
  send: (options: any) => Promise<any>;
  verify?: () => Promise<boolean>;
  isIdle?: () => boolean;
  close?: () => void;
  getCapabilities?: () => Capabilities;
}

export interface Settings {
  defaultFrom: string;
  defaultReplyTo?: string;
}

export interface Capabilities {
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
