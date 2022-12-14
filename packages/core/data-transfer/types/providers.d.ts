import type {
  IDestinationProviderTransferResults,
  IProviderTransferResults,
  ISourceProviderTransferResults,
  Stream,
} from './utils';
import type { IMetadata } from './common-entities';
import type { PipelineSource, PipelineDestination, Readable, Writable } from 'stream';

type ProviderType = 'source' | 'destination';

interface IProvider {
  type: ProviderType;
  name: string;
  results?: IProviderTransferResults;

  bootstrap?(): Promise<void> | void;
  getSchemas?(): any;
  close?(): Promise<void> | void;
  getMetadata(): IMetadata | null | Promise<IMetadata | null>;
  beforeTransfer?(): Promise<void>;
  validateOptions?(): void;
}

export interface ISourceProvider extends IProvider {
  results?: ISourceProviderTransferResults;

  // Getters for the source's transfer streams
  streamEntities?(): Readable | Promise<Readable>;
  streamLinks?(): Readable | Promise<Readable>;
  streamAssets?(): Readable | Promise<Readable>;
  streamConfiguration?(): Readable | Promise<Readable>;
  getSchemas?(): Strapi.Schemas | Promise<Strapi.Schemas>;
  streamSchemas?(): Readable | Promise<Readable>;
}

export interface IDestinationProvider extends IProvider {
  results?: IDestinationProviderTransferResults;

  /**
   * Optional rollback implementation
   */
  rollback?<T extends Error = Error>(e: T): void | Promise<void>;

  setMetadata?(target: ProviderType, metadata: IMetadata): IDestinationProvider;

  // Getters for the destination's transfer streams
  getEntitiesStream?(): Writable | Promise<Writable>;
  getLinksStream?(): Writable | Promise<Writable>;
  getAssetsStream?(): Writable | Promise<Writable>;
  getConfigurationStream?(): Writable | Promise<Writable>;
  getSchemas?(): Strapi.Schemas | Promise<Strapi.Schemas>;
  getSchemasStream?(): Writable | Promise<Writable>;
}
