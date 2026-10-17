import _ from 'lodash';
import sharp from 'sharp';

import { errors, file } from '@strapi/utils';
import type { Core } from '@strapi/types';

import registerUploadMiddleware from './middlewares/upload';
import { unsignRichtextAndBlocksUrls } from './migrations/unsign-richtext-and-blocks-urls';
import spec from '../../documentation/content-api.json';
import type { Config, File, InputFile } from './types';
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
  let provider;

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
// Every method runs with `this` bound to the provider instance, so a call like
// `this.upload(file)` inside the provider does not receive `actionOptions`.
const TWO_ARG_METHODS = ['upload', 'uploadStream', 'delete', 'checkFileSize', 'getSignedUrl'];
const THREE_ARG_METHODS = ['replace', 'replaceStream'];

const wrapWithActionOptions = (
  providerInstance: Record<string, unknown>,
  actionOptions: Config['actionOptions']
) => {
  const wrapped: Record<string, unknown> = _.mapValues(providerInstance, (value) =>
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
        `${file.originalFilename} exceeds size limit of ${bytesToHumanReadable(sizeLimit)}.`
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
