import type { Core, Providers } from '@strapi/types';
import sendmailProvider from '@strapi/provider-email-sendmail';
import type { EmailConfig, LoadedProviderModule } from './types';

const isProviderModule = (value: unknown): value is LoadedProviderModule =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<LoadedProviderModule>).init === 'function';

/**
 * Returns the provider module, unwrapping a module imported from ESM, which can
 * come wrapped in its namespace object.
 */
const toProviderModule = (value: unknown): LoadedProviderModule | undefined => {
  if (isProviderModule(value)) {
    return value;
  }

  const defaultExport = (value as { default?: unknown } | null | undefined)?.default;
  return isProviderModule(defaultExport) ? defaultExport : undefined;
};

/**
 * Finds the provider module set in `plugin::email.provider`: an imported module, or a
 * name resolved to `@strapi/provider-email-<name>` or to a package name.
 */
const resolveProvider = (
  strapi: Core.Strapi,
  provider: EmailConfig['provider']
): { name: string; module: LoadedProviderModule } => {
  if (typeof provider !== 'string') {
    const module = toProviderModule(provider);

    if (!module) {
      throw new Error(
        'The email provider set in the "plugin::email" config is not a provider module: it must export an "init" function.'
      );
    }

    if (typeof module.name !== 'string' || module.name === '') {
      throw new Error(
        'The email provider set in the "plugin::email" config has no "name". Set one, for example: `provider: { ...provider, name: \'my-provider\' }`.'
      );
    }

    return { name: module.name, module };
  }

  const providerName = provider.toLowerCase();
  const packageName = `@strapi/provider-email-${providerName}`;

  // Resolving by name will be removed in the next major, along with the default
  // provider. The default is still imported statically, so it can be bundled.
  const warnResolvedByName = (importHint: string) => {
    strapi.log.warn(
      `The email provider "${providerName}" is resolved by name, which will be removed in the next major. ${importHint}`
    );
  };
  const importPackageHint = `Add "${packageName}" to your dependencies and import it as \`provider\` in config/plugins instead.`;

  if (providerName === 'sendmail') {
    warnResolvedByName(importPackageHint);
    return { name: providerName, module: sendmailProvider };
  }

  let modulePath: string;
  try {
    modulePath = require.resolve(packageName);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'MODULE_NOT_FOUND'
    ) {
      modulePath = providerName;
    } else {
      throw error;
    }
  }

  warnResolvedByName(
    modulePath === providerName
      ? 'Import the provider as `provider` in config/plugins instead.'
      : importPackageHint
  );

  let loaded: unknown;
  try {
    loaded = require(modulePath);
  } catch (err) {
    const newError = new Error(`Could not load email provider "${providerName}".`);

    if (err instanceof Error) {
      newError.stack = err.stack;
    }

    throw newError;
  }

  const module = toProviderModule(loaded);

  if (!module) {
    throw new Error(
      `The email provider "${providerName}" is not a provider module: it must export an "init" function.`
    );
  }

  // An imported provider is used under its `name`. Report now what would
  // change for this app once it imports the provider.
  if (typeof module.name !== 'string' || module.name === '') {
    strapi.log.warn(
      `The email provider "${providerName}" doesn't export a "name". Its package must add one before it can be imported in config/plugins.`
    );
  } else if (module.name !== providerName) {
    strapi.log.warn(
      `The email provider "${providerName}" exports the name "${module.name}". Imported, it would be reported as "${module.name}". To keep "${providerName}" when you import it, set \`provider: { ...provider, name: '${providerName}' }\`.`
    );
  }

  return { name: providerName, module };
};

export const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const emailConfig: EmailConfig = strapi.config.get('plugin::email');

  const { name: providerName, module } = resolveProvider(strapi, emailConfig.provider);

  // Code reading `plugin::email.provider` expects a string, so an imported
  // provider is replaced by its name.
  strapi.config.set('plugin::email.provider', providerName);

  const isDevelopment = process.env.NODE_ENV === 'development';
  if (providerName === 'sendmail' && isDevelopment) {
    strapi.log.warn(
      '[email]: The "sendmail" email provider is still supported, but for most production setups that use a dedicated SMTP relay, consider switching to @strapi/provider-email-nodemailer (import it as `provider` in your email plugin config). This message is only shown in development.'
    );
  }

  strapi.plugin('email').provider = (module as Providers.Email.Factory).init(
    emailConfig.providerOptions,
    emailConfig.settings
  );

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
