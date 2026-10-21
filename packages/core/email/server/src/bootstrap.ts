import type { Core, Providers } from '@strapi/types';
import type { EmailConfig } from './types';

const createProvider = (emailConfig: EmailConfig) => {
  const providerName = emailConfig.provider.toLowerCase();
  let provider: Providers.Email.Factory;

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
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (providerName === 'sendmail' && isDevelopment) {
    strapi.log.warn(
      '[email]: The "sendmail" email provider is still supported, but for most production setups that use a dedicated SMTP relay, consider switching to @strapi/provider-email-nodemailer (set `provider` to `"nodemailer"` in your email plugin config). This message is only shown in development.'
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
