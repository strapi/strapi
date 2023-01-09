import type {
  IDestinationProviderTransferResults,
  IProviderTransferResults,
  ISourceProviderTransferResults,
  Stream,
  MaybePromise,
} from './utils';
import type { IMetadata } from './common-entities';
import type { PipelineSource, PipelineDestination, Readable, Writable } from 'stream';

type ProviderType = 'source' | 'destination';

interface IProvider {
  type: ProviderType;
  name: string;
  results?: IProviderTransferResults;

  bootstrap?(): MaybePromise<void>;
  close?(): MaybePromise<void>;

  getMetadata(): MaybePromise<IMetadata | null>;
  getSchemas?(): MaybePromise<Strapi.Schemas>;

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
