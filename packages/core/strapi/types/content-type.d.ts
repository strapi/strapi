export interface CoreStore {
  key: string;
  value: any;
  type: string;
  environment: string | null;
  tag: string | null;
}

export interface Webhook {
  name: string;
  url: string;
  headers: Record<string, any>;
  events: Record<string, any>;
  enabled: boolean;
}

export interface StrapiContentTypes {
  'strapi::core-store': CoreStore;
  webhook: Webhook;
}
