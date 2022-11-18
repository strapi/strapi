import {
  IDestinationProviderTransferResults,
  IProviderTransferResults,
  ISourceProviderTransferResults,
  Stream,
} from './utils';
import { IMetadata } from './common-entities';
import { PipelineSource, PipelineDestination } from 'stream';

type ProviderType = 'source' | 'destination';

interface IProvider {
  type: ProviderType;
  name: string;
  results?: IProviderTransferResults;

  bootstrap?(): Promise<void> | void;
  getSchemas?(): any;
  close?(): Promise<void> | void;
  getMetadata(): IMetadata | null | Promise<IMetadata | null>;
}

export interface ISourceProvider extends IProvider {
  results?: ISourceProviderTransferResults;

  // Getters for the source's transfer streams
  streamEntities?(): NodeJS.ReadableStream | Promise<NodeJS.ReadableStream>;
  streamLinks?(): NodeJS.ReadableStream | Promise<NodeJS.ReadableStream>;
  streamMedia?(): NodeJS.ReadableStream | Promise<NodeJS.ReadableStream>;
  streamConfiguration?(): NodeJS.ReadableStream | Promise<NodeJS.ReadableStream>;
  streamSchemas?(): NodeJS.ReadableStream | Promise<NodeJS.ReadableStream>;
}

export interface IDestinationProvider extends IProvider {
  results?: IDestinationProviderTransferResults;
  #providersMetadata?: { source?: IMetadata; destination?: IMetadata };

  /**
   * Optional rollback implementation
   */
  rollback?<T extends Error = Error>(e: T): void | Promise<void>;

  setMetadata?(target: ProviderType, metadata: IMetadata): IDestinationProvider;

  // Getters for the destination's transfer streams
  getEntitiesStream?(): NodeJS.WritableStream | Promise<NodeJS.WritableStream>;
  getLinksStream?(): NodeJS.WritableStream | Promise<NodeJS.WritableStream>;
  getMediaStream?(): NodeJS.WritableStream | Promise<NodeJS.WritableStream>;
  getConfigurationStream?(): NodeJS.WritableStream | Promise<NodeJS.WritableStream>;
  getSchemasStream?(): NodeJS.WritableStream | Promise<NodeJS.WritableStream>;
}
