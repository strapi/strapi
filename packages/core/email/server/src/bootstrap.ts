import type { Core } from '@strapi/types';
import type { ProviderCapabilities } from '../../shared/types';
import type { EmailConfig, SendOptions } from './types';

interface EmailProvider {
  send: (options: SendOptions) => Promise<any>;
  verify?: () => Promise<boolean>;
  isIdle?: () => boolean;
  close?: () => void;
  getCapabilities?: () => ProviderCapabilities;
}

interface EmailProviderModule {
  init: (
    options: EmailConfig['providerOptions'],
    settings: EmailConfig['settings']
  ) => EmailProvider;
  name?: string;
  provider?: string;
}

const createProvider = (emailConfig: EmailConfig) => {
  const providerName = emailConfig.provider.toLowerCase();
  let provider: EmailProviderModule;

  let modulePath: string;
  try {
    modulePath = require.resolve(`@strapi/provider-email-${providerName}`);
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'MODULE_NOT_FOUND'
    ) {
      modulePath = providerName;
    } else {
      throw error;
    }
  }

  try {
    provider = require(modulePath);
  } catch (err) {
    const newError = new Error(`Could not load email provider "${providerName}".`);
    if (err instanceof Error) {
      newError.stack = err.stack;
    }
    throw newError;
  }

  return provider.init(emailConfig.providerOptions, emailConfig.settings);
};

export const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const emailConfig: EmailConfig = strapi.config.get('plugin::email');

  const providerName = emailConfig.provider.toLowerCase();
  const isDev = process.env.NODE_ENV !== 'production';
  if (providerName === 'sendmail' && isDev) {
    strapi.log.warn(
      '[email]: The "sendmail" email provider is still supported, but for most production setups that use a dedicated SMTP relay, consider switching to @strapi/provider-email-nodemailer (set `provider` to `"nodemailer"` in your email plugin config). This message is only shown in non-production environments.'
    );
  }

  strapi.plugin('email').provider = createProvider(emailConfig);

  // Add permissions
  const actions = [
    {
      section: 'settings',
      category: 'email',
      displayName: 'Access the Email Settings page',
      uid: 'settings.read',
      pluginName: 'email',
    },
  ];

  await strapi.service('admin::permission').actionProvider.registerMany(actions);
};
