import _ from 'lodash';
import sharp from 'sharp';

import { errors, file } from '@strapi/utils';
import type { Core, Providers } from '@strapi/types';
import localProvider from '@strapi/provider-upload-local';

import registerUploadMiddleware from './middlewares/upload';
import { unsignRichtextAndBlocksUrls } from './migrations/unsign-richtext-and-blocks-urls';
import spec from '../../documentation/content-api.json';
import type { Config, LoadedProviderModule, UploadProvider, UserConfig } from './types';
import { aiMetadataJob } from './models/ai-metadata-job';
import { registerUploadMcpTools } from './mcp';

const { PayloadTooLargeError } = errors;
const { bytesToHumanReadable, kbytesToBytes } = file;

/**
 * Register upload plugin
 */
export async function register({ strapi }: { strapi: Core.Strapi }) {
  // Register AI metadata job model
  strapi.get('models').add(aiMetadataJob);

  const raw = strapi.config.get<Partial<UserConfig> | null | undefined>('plugin::upload') ?? {};
  // createProvider needs a provider; empty get() (e.g. in tests) still has defaults.
  const uploadConfig = {
    provider: 'local' as const,
    providerOptions: {} as Config['providerOptions'],
    actionOptions: {} as Config['actionOptions'],
    ...raw,
  } as UserConfig;

  // Configure sharp memory management
  const { cache = false, concurrency = 1 } = uploadConfig.sharp ?? {};
  sharp.cache(cache);
  sharp.concurrency(concurrency);

  const { name, module } = resolveProvider(strapi, uploadConfig.provider);

  // Files store the provider name, and code reading `plugin::upload.provider`
  // expects a string, so an imported provider is replaced by its name.
  strapi.config.set('plugin::upload.provider', name);

  strapi.plugin('upload').provider = createProvider(name, module, uploadConfig);

  // Rewrites richtext / blocks URLs persisted with a (now expired) signature
  strapi.db.migrations.providers.internal.register(unsignRichtextAndBlocksUrls);

  await registerUploadMiddleware({ strapi });

  // Register phase, before the MCP HTTP server starts during bootstrap.
  registerUploadMcpTools({ strapi });

  if (strapi.plugin('graphql')) {
    const { installGraphqlExtension } = await import('./graphql.js');
    installGraphqlExtension({ strapi });
  }

  if (strapi.plugin('documentation')) {
    strapi
      .plugin('documentation')
      .service('override')
      .registerOverride(spec, {
        pluginOrigin: 'upload',
        excludeFromGeneration: ['upload'],
      });
  }
}

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
 * Finds the provider module set in `plugin::upload.provider`: an imported module, or a
 * name resolved to `@strapi/provider-upload-<name>` or to a package name.
 */
const resolveProvider = (
  strapi: Core.Strapi,
  provider: UserConfig['provider']
): { name: string; module: LoadedProviderModule } => {
  if (typeof provider !== 'string') {
    const module = toProviderModule(provider);

    if (!module) {
      throw new Error(
        'The upload provider set in the "plugin::upload" config is not a provider module: it must export an "init" function.'
      );
    }

    if (typeof module.name !== 'string' || module.name === '') {
      throw new Error(
        'The upload provider set in the "plugin::upload" config has no "name". Set one, for example: `provider: { ...provider, name: \'my-provider\' }`.'
      );
    }

    return { name: module.name, module };
  }

  const providerName = _.toLower(provider);
  const packageName = `@strapi/provider-upload-${providerName}`;

  // Resolving by name will be removed in the next major, along with the default
  // provider. The default is still imported statically, so it can be bundled.
  const warnResolvedByName = (importHint: string) => {
    strapi.log.warn(
      `The upload provider "${providerName}" is resolved by name, which will be removed in the next major. ${importHint}`
    );
  };
  const importPackageHint = `Add "${packageName}" to your dependencies and import it as \`provider\` in config/plugins instead.`;

  if (providerName === 'local') {
    warnResolvedByName(importPackageHint);
    return { name: providerName, module: localProvider };
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
    const newError = new Error(`Could not load upload provider "${providerName}".`);

    if (err instanceof Error) {
      newError.stack = err.stack;
    }

    throw newError;
  }

  const module = toProviderModule(loaded);

  if (!module) {
    throw new Error(
      `The upload provider "${providerName}" is not a provider module: it must export an "init" function.`
    );
  }

  // An imported provider is used under its `name`. Report now what would
  // change for this app once it imports the provider.
  if (typeof module.name !== 'string' || module.name === '') {
    strapi.log.warn(
      `The upload provider "${providerName}" doesn't export a "name". Its package must add one before it can be imported in config/plugins.`
    );
  } else if (module.name !== providerName) {
    strapi.log.warn(
      `The upload provider "${providerName}" exports the name "${module.name}", but files store "${providerName}". Imported, it would be stored as "${module.name}" and existing files would no longer match it. To keep "${providerName}" when you import it, set \`provider: { ...provider, name: '${providerName}' }\`.`
    );
  }

  return { name: providerName, module };
};

const createProvider = (
  providerName: string,
  provider: LoadedProviderModule,
  config: UserConfig
): UploadProvider => {
  const { providerOptions, actionOptions = {} } = config;

  const providerInstance = (provider as Providers.Upload.Factory<Config['providerOptions']>).init(
    providerOptions
  );

  if (!providerInstance.delete) {
    throw new Error(`The upload provider "${providerName}" doesn't implement the delete method.`);
  }

  if (!providerInstance.upload && !providerInstance.uploadStream) {
    throw new Error(
      `The upload provider "${providerName}" doesn't implement the uploadStream nor the upload method.`
    );
  }

  if (!providerInstance.uploadStream) {
    process.emitWarning(
      `The upload provider "${providerName}" doesn't implement the uploadStream function. Strapi will fallback on the upload method. Some performance issues may occur.`
    );
  }

  // Providers can return methods beyond the contract, and they are wrapped too
  const wrappedProvider = _.mapValues(providerInstance, (method, methodName) => {
    return async (file: unknown, options = actionOptions[methodName]) =>
      (method as (...args: unknown[]) => unknown).call(providerInstance, file, options);
  });

  const uploadProvider: UploadProvider = Object.assign(
    Object.create(baseProvider) as typeof baseProvider,
    wrappedProvider
  );

  return uploadProvider;
};

const baseProvider = {
  extend(obj: unknown) {
    Object.assign(this, obj);
  },
  checkFileSize(
    file: Readonly<Providers.Upload.PendingFile>,
    { sizeLimit }: Providers.Upload.CheckFileSizeOptions
  ) {
    if (sizeLimit && kbytesToBytes(file.size) > sizeLimit) {
      throw new PayloadTooLargeError(
        `${file.name} exceeds size limit of ${bytesToHumanReadable(sizeLimit)}.`
      );
    }
  },
  getSignedUrl(file: Readonly<Providers.Upload.SignableFile>) {
    return file;
  },
  isPrivate() {
    return false;
  },
};
