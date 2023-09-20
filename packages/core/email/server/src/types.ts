export interface EmailConfig {
  provider: string;
  providerOptions?: object;
  settings?: {
    defaultFrom?: string;
  };
}

export interface StrapiConfig {
  default: EmailConfig;
  validator: () => void;
}

export interface EmailTemplateData {
  url?: string;
  user?: {
    email: string;
    firstname: string;
    lastname: string;
    username: string;
  };
}

export interface EmailOptions {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  [key: string]: string | undefined; // for flexibility, allowing other properties if necessary
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html?: string;
  [key: string]: string | undefined; // to allow additional template attributes if needed
}

export type SendOptions = EmailOptions & EmailTemplate;
