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
  name: string; // a unique name for this provider
  results?: IProviderTransferResults; // optional object for tracking any data needed from outside the engine

  /**
   * bootstrap() is called during transfer engine bootstrap
   * It is used for initialization operations such as making a database connection, opening a file, checking authorization, etc
   */
  bootstrap?(): MaybePromise<void>;
  close?(): MaybePromise<void>; // called during transfer engine close

  getMetadata(): MaybePromise<IMetadata | null>; // returns the transfer metadata to be used for version validation
  getSchemas?(): MaybePromise<Record<string, Struct.Schema> | null>; // returns the schemas for the schema validation

  beforeTransfer?(): MaybePromise<void>; // called immediately before transfer stages are run
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
   * Called when an error is thrown during a transfer to allow rollback operations to be performed
   */
  rollback?<T extends Error = Error>(e: T): MaybePromise<void>;

  setMetadata?(target: ProviderType, metadata: IMetadata): IDestinationProvider;
  onWarning?: (message: string) => void;

  createEntitiesWriteStream?(): MaybePromise<Writable>;
  createLinksWriteStream?(): MaybePromise<Writable>;
  createAssetsWriteStream?(): MaybePromise<Writable>;
  createConfigurationWriteStream?(): MaybePromise<Writable>;
  createSchemasWriteStream?(): MaybePromise<Writable>;
}
