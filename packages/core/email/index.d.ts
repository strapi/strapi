declare module '@strapi/plugin-email' {
  export interface Settings {
    defaultFrom: string;
    defaultReplyTo: string;
  }

  export interface SendOptions {
    from?: string;
    to: string;
    cc: string;
    bcc: string;
    replyTo?: string;
    subject: string;
    text: string;
    html: string;
    [key: string]: unknown;
  }
}
