import { Readable } from 'stream';
import { chain } from 'stream-chain';
import type { Core, Struct } from '@strapi/types';

import type { IMetadata, ISourceProvider, ProviderType, TransferStage } from '../../../../types';
import type { IDiagnosticReporter } from '../../../utils/diagnostic';
import { createEntitiesStream, createEntitiesTransformStream } from './entities';
import { createLinksStream } from './links';
import { createConfigurationStream } from './configuration';
import { createAssetsStream } from './assets';
import { estimateAssetTotals } from './estimate-asset-totals';
import { estimateConfigurationTotals } from './estimate-configuration-totals';
import { estimateEntityTotals } from './estimate-entity-totals';
import { estimateLinkTotals } from './estimate-link-totals';
import * as utils from '../../../utils';
import { assertValidStrapi } from '../../../utils/providers';

export interface ILocalStrapiSourceProviderOptions {
  getStrapi(): Core.Strapi | Promise<Core.Strapi>; // return an initialized instance of Strapi

  autoDestroy?: boolean; // shut down the instance returned by getStrapi() at the end of the transfer
}

export const createLocalStrapiSourceProvider = (options: ILocalStrapiSourceProviderOptions) => {
  return new LocalStrapiSourceProvider(options);
};

class LocalStrapiSourceProvider implements ISourceProvider {
  name = 'source::local-strapi';

  type: ProviderType = 'source';

  options: ILocalStrapiSourceProviderOptions;

  strapi?: Core.Strapi;

  #diagnostics?: IDiagnosticReporter;

  constructor(options: ILocalStrapiSourceProviderOptions) {
    this.options = options;
  }

  async bootstrap(diagnostics?: IDiagnosticReporter): Promise<void> {
    this.#diagnostics = diagnostics;
    this.strapi = await this.options.getStrapi();
    this.strapi.db.lifecycles.disable();
  }

  #reportInfo(message: string) {
    this.#diagnostics?.report({
      details: {
        createdAt: new Date(),
        message,
        origin: 'local-source-provider',
      },
      kind: 'info',
    });
  }

  #reportWarning(message: string) {
    this.#diagnostics?.report({
      details: {
        createdAt: new Date(),
        message,
        origin: 'local-source-provider',
      },
      kind: 'warning',
    });
  }

  /**
   * Reports an error to the diagnostic reporter.
   */
  #reportError(message: string, error: Error) {
    this.#diagnostics?.report({
      details: {
        createdAt: new Date(),
        message,
        error,
        severity: 'fatal',
        name: error.name,
      },
      kind: 'error',
    });
  }

  /**
   * Handles errors that occur in read streams.
   */
  #handleStreamError(streamType: string, err: Error) {
    const { message, stack } = err;
    const errorMessage = `[Data transfer] Error in ${streamType} read stream: ${message}`;
    const formattedError = {
      message: errorMessage,
      stack,
      timestamp: new Date().toISOString(),
    };

    this.strapi?.log.error(formattedError);
    this.#reportError(formattedError.message, err);
  }

  async close(): Promise<void> {
    const { autoDestroy } = this.options;
    assertValidStrapi(this.strapi);
    this.strapi.db.lifecycles.enable();
    // Basically `!== false` but more deterministic
    if (autoDestroy === undefined || autoDestroy === true) {
      await this.strapi?.destroy();
    }
  }

  getMetadata(): IMetadata {
    this.#reportInfo('getting metadata');
    assertValidStrapi(this.strapi);
    const strapiVersion = this.strapi.config.get<string>('info.strapi');
    const createdAt = new Date().toISOString();

    return {
      createdAt,
      strapi: {
        version: strapiVersion,
      },
    };
  }

  async createEntitiesReadStream(): Promise<Readable> {
    assertValidStrapi(this.strapi, 'Not able to stream entities');
    this.#reportInfo('creating entities read stream');
    return chain([
      // Entities stream
      createEntitiesStream(this.strapi),

      // Transform stream
      createEntitiesTransformStream(),
    ]);
  }

  createLinksReadStream(): Readable {
    assertValidStrapi(this.strapi, 'Not able to stream links');
    this.#reportInfo('creating links read stream');

    return createLinksStream(this.strapi);
  }

  createConfigurationReadStream(): Readable {
    assertValidStrapi(this.strapi, 'Not able to stream configuration');
    this.#reportInfo('creating configuration read stream');
    return createConfigurationStream(this.strapi);
  }

  getSchemas(): Record<string, Struct.Schema> {
    assertValidStrapi(this.strapi, 'Not able to get Schemas');
    this.#reportInfo('getting schemas');
    const schemas = utils.schema.schemasToValidJSON({
      ...this.strapi.contentTypes,
      ...this.strapi.components,
    });

    return utils.schema.mapSchemasValues(schemas);
  }

  createSchemasReadStream(): Readable {
    return Readable.from(Object.values(this.getSchemas()));
  }

  createAssetsReadStream(): Readable {
    assertValidStrapi(this.strapi, 'Not able to stream assets');
    this.#reportInfo('creating assets read stream');

    const stream = createAssetsStream(this.strapi, {
      onWarning: (message) => this.#reportWarning(message),
    });
    stream.on('error', (err) => {
      this.#handleStreamError('assets', err);
    });

    return stream;
  }

  async getStageTotals(stage: TransferStage) {
    if (stage === 'assets') {
      assertValidStrapi(this.strapi, 'Not able to estimate asset totals');
      return estimateAssetTotals(this.strapi);
    }
    if (stage === 'entities') {
      assertValidStrapi(this.strapi, 'Not able to estimate entity totals');
      return estimateEntityTotals(this.strapi);
    }
    if (stage === 'links') {
      assertValidStrapi(this.strapi, 'Not able to estimate link totals');
      return estimateLinkTotals(this.strapi);
    }
    if (stage === 'configuration') {
      assertValidStrapi(this.strapi, 'Not able to estimate configuration totals');
      return estimateConfigurationTotals(this.strapi);
    }
    return null;
  }
}

export type ILocalStrapiSourceProvider = InstanceType<typeof LocalStrapiSourceProvider>;

export { estimateAssetTotals } from './estimate-asset-totals';
export { estimateConfigurationTotals } from './estimate-configuration-totals';
export { estimateEntityTotals } from './estimate-entity-totals';
export { estimateLinkTotals } from './estimate-link-totals';
