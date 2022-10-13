import { Stream } from './utils';
import { IMetadata } from './common-entities';
import { PipelineSource, PipelineDestination } from 'stream';

type ProviderType = 'source' | 'destination';

interface IProvider {
  type: ProviderType;
  name: string;

  bootstrap?(): Promise<void> | void;
  close?(): Promise<void> | void;
  getMetadata(): IMetadata | Promise<IMetadata>;
}

export interface ISourceProvider extends IProvider {
  // Getters for the source's transfer streams
  streamEntities?(): PipelineSource | Promise<PipelineSource>;
  streamLinks?(): PipelineSource | Promise<PipelineSource>;
  streamMedia?(): PipelineSource | Promise<PipelineSource>;
  streamConfiguration?(): PipelineSource | Promise<PipelineSource>;
}

export interface IDestinationProvider extends IProvider {
  /**
   * Optional rollback implementation
   */
  rollback?<T extends Error = Error>(e: T): void | Promise<void>;

  // Getters for the destination's transfer streams
  getEntitiesStream?(): PipelineDestination | Promise<PipelineDestination>;
  getLinksStream?(): PipelineDestination | Promise<PipelineDestination>;
  getMediaStream?(): PipelineDestination | Promise<PipelineDestination>;
  getConfigurationStream?(): PipelineDestination | Promise<PipelineDestination>;
}
