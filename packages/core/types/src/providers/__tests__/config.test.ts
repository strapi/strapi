import type * as Email from '../email';
import type * as Upload from '../upload';

interface S3Options {
  region: string;
  bucket?: string;
}

declare const s3: {
  name: string;
  init: (options: S3Options) => Upload.Provider;
};

declare const local: {
  name: string;
  init: (options?: { sizeLimit?: number }) => Upload.Provider;
};

export const uploadConfig = {
  provider: s3,
  providerOptions: { region: 'eu-west-1', bucket: 'media' },
  actionOptions: { upload: { ACL: 'private' } },
} satisfies Upload.Config<typeof s3>;

export const uploadConfigWithoutOptions = { provider: local } satisfies Upload.Config<typeof local>;

export const uploadConfigWithUnknownOption = {
  provider: s3,
  // @ts-expect-error `providerOptions` is checked against the provider's options.
  providerOptions: { region: 'eu-west-1', unknown: true },
} satisfies Upload.Config<typeof s3>;

export const uploadConfigWithMissingOption = {
  provider: s3,
  // @ts-expect-error `region` is required by the provider.
  providerOptions: { bucket: 'media' },
} satisfies Upload.Config<typeof s3>;

export const uploadConfigWithProviderName = {
  // @ts-expect-error A provider name is not part of the typed config.
  provider: 'aws-s3',
} satisfies Upload.Config;

// @ts-expect-error A provider module must have a `name`.
export type UploadConfigWithUnnamedProvider = Upload.Config<{ init: typeof s3.init }>;

interface SmtpOptions {
  host: string;
  port?: number;
}

declare const smtp: {
  name: string;
  init: (options: SmtpOptions, settings: Email.Settings) => Email.Provider;
};

export const emailConfig = {
  provider: smtp,
  providerOptions: { host: 'smtp.example.com', port: 587 },
  settings: { defaultReplyTo: 'support@example.com' },
} satisfies Email.Config<typeof smtp>;

export const emailConfigWithUnknownOption = {
  provider: smtp,
  // @ts-expect-error `providerOptions` is checked against the provider's options.
  providerOptions: { host: 'smtp.example.com', unknown: true },
} satisfies Email.Config<typeof smtp>;
