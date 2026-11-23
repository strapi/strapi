import _ from 'lodash';
import sharp from 'sharp';

import { errors, file } from '@strapi/utils';
import type { Core, Providers } from '@strapi/types';

import registerUploadMiddleware from './middlewares/upload';
import { unsignRichtextAndBlocksUrls } from './migrations/unsign-richtext-and-blocks-urls';
import spec from '../../documentation/content-api.json';
import type { Config, File, InputFile } from './types';
import { aiMetadataJob } from './models/ai-metadata-job';
import { registerUploadMcpTools } from './mcp';
import { warnOnSizeLimitMismatch } from './size-limit-warning';
import type { UploadTooLargeDetails } from '../../shared/contracts/files';

const { PayloadTooLargeError } = errors;
const { bytesToHumanReadable, kbytesToBytes } = file;

/**
 * Register upload plugin
 */
export async function register({ strapi }: { strapi: Core.Strapi }) {
  // Register AI metadata job model
  strapi.get('models').add(aiMetadataJob);

  const raw = strapi.config.get<Partial<Config> | null | undefined>('plugin::upload') ?? {};
  // createProvider needs a provider; empty get() (e.g. in tests) still has defaults.
  const uploadConfig = {
    provider: 'local' as const,
    providerOptions: {} as Config['providerOptions'],
    actionOptions: {} as Config['actionOptions'],
    ...raw,
  } as Config;

  // Configure sharp memory management
  const { cache = false, concurrency = 1 } = uploadConfig.sharp ?? {};
  sharp.cache(cache);
  sharp.concurrency(concurrency);

  strapi.plugin('upload').provider = createProvider(uploadConfig);

  warnOnSizeLimitMismatch({ strapi });

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

const createProvider = (config: Config) => {
  const { providerOptions, actionOptions = {} } = config;

  const providerName = _.toLower(config.provider);
  // Documents what the module should be: `require` returns `any`, so nothing is checked here.
  let provider: Providers.Upload.Factory<
    Config['providerOptions'],
    Providers.Upload.Provider & Record<string, unknown>
  >;

  let modulePath;
  try {
    modulePath = require.resolve(`@strapi/provider-upload-${providerName}`);
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

  try {
    provider = require(modulePath);
  } catch (err) {
    const newError = new Error(`Could not load upload provider "${providerName}".`);

    if (err instanceof Error) {
      newError.stack = err.stack;
    }

    throw newError;
  }

  const providerInstance = provider.init(providerOptions);

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

  return Object.assign(
    Object.create(baseProvider),
    wrapWithActionOptions(providerInstance, actionOptions)
  );
};

// Contract methods whose last (options) argument defaults to `actionOptions[methodName]`,
// grouped by arity: (file, options) and (newFile, oldFile, options).
// Other methods of the provider (e.g. provider-specific helpers) keep their signature.
// The provider's own methods run with `this` bound to the provider instance, so a call like
// `this.upload(file)` inside the provider does not receive `actionOptions`.
const TWO_ARG_METHODS = ['upload', 'uploadStream', 'delete', 'checkFileSize', 'getSignedUrl'];
const THREE_ARG_METHODS = ['replace', 'replaceStream'];
const CONTRACT_METHODS = new Set([...TWO_ARG_METHODS, ...THREE_ARG_METHODS, 'isPrivate', 'extend']);

const wrapWithActionOptions = (
  providerInstance: Record<string, unknown>,
  actionOptions: Config['actionOptions']
) => {
  // A contract method declared with a non-function value (e.g. `uploadStream: undefined`,
  // `isPrivate: false`, `getSignedUrl: null`) must stay missing, so callers fall back on `upload`
  // and the base provider defaults still apply. Other members set to `undefined` are dropped too;
  // other data members (e.g. `version: 2`) are kept.
  const definedMembers = _.omitBy(
    providerInstance,
    (value, key) =>
      value === undefined || (CONTRACT_METHODS.has(key) && typeof value !== 'function')
  );
  const wrapped: Record<string, unknown> = _.mapValues(definedMembers, (value) =>
    typeof value === 'function' ? value.bind(providerInstance) : value
  );
  const methodOf = (name: string) => {
    const method = providerInstance[name];
    return typeof method === 'function' ? (method as (...args: unknown[]) => unknown) : undefined;
  };

  for (const name of TWO_ARG_METHODS) {
    const method = methodOf(name);
    if (method) {
      wrapped[name] = async (file: File, options = actionOptions[name]) =>
        method.call(providerInstance, file, options);
    }
  }

  for (const name of THREE_ARG_METHODS) {
    const method = methodOf(name);
    if (method) {
      wrapped[name] = async (newFile: File, oldFile: File, options = actionOptions[name]) =>
        method.call(providerInstance, newFile, oldFile, options);
    }
  }

  const isPrivate = methodOf('isPrivate');
  if (isPrivate) {
    wrapped.isPrivate = async () => isPrivate.call(providerInstance);
  }

  return wrapped;
};

const baseProvider = {
  extend(obj: unknown) {
    Object.assign(this, obj);
  },
  checkFileSize(file: InputFile, { sizeLimit }: { sizeLimit: number }) {
    if (sizeLimit && kbytesToBytes(file.size) > sizeLimit) {
      throw new PayloadTooLargeError(
        `${file.originalFilename} exceeds size limit of ${bytesToHumanReadable(sizeLimit)}.`,
        { code: 'SizeLimitExceeded', limit: sizeLimit } satisfies UploadTooLargeDetails
      );
    }
  },
  getSignedUrl(file: File) {
    return file;
  },
  isPrivate() {
    return false;
  },
};
