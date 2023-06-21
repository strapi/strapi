import type { Schema, Utils } from '@strapi/strapi';
import type { Readable, Writable } from 'stream';
import type {
  IDestinationProviderTransferResults,
  IProviderTransferResults,
  ISourceProviderTransferResults,
  MaybePromise,
} from './utils';
import type { IMetadata } from './common-entities';

export type ProviderType = 'source' | 'destination';

export interface IProvider {
  type: ProviderType;
  name: string;
  results?: IProviderTransferResults;

  bootstrap?(): MaybePromise<void>;
  close?(): MaybePromise<void>;

  getMetadata(): MaybePromise<IMetadata | null>;
  getSchemas?(): MaybePromise<Utils.StringRecord<Schema.Schema> | null>;

  beforeTransfer?(): MaybePromise<void>;
  validateOptions?(): MaybePromise<void>;
}

export interface ISourceProvider extends IProvider {
  results?: ISourceProviderTransferResults;

  createEntitiesReadStream?(): MaybePromise<Readable>;
  createLinksReadStream?(): MaybePromise<Readable>;
  createAssetsReadStream?(): MaybePromise<Readable>;
  createConfigurationReadStream?(): MaybePromise<Readable>;
  createSchemasReadStream?(): MaybePromise<Readable>;
}

export interface IDestinationProvider extends IProvider {
  results?: IDestinationProviderTransferResults;

  /**
   * Optional rollback implementation
   */
  rollback?<T extends Error = Error>(e: T): MaybePromise<void>;

  setMetadata?(target: ProviderType, metadata: IMetadata): IDestinationProvider;

  createEntitiesWriteStream?(): MaybePromise<Writable>;
  createLinksWriteStream?(): MaybePromise<Writable>;
  createAssetsWriteStream?(): MaybePromise<Writable>;
  createConfigurationWriteStream?(): MaybePromise<Writable>;
  createSchemasWriteStream?(): MaybePromise<Writable>;
}
