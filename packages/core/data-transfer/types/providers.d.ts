import { Stream } from './utils';
import { IMetadata } from './common-entities';

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
  streamEntities?(): Stream | Promise<Stream>;
  streamLinks?(): Stream | Promise<Stream>;
  streamMedia?(): Stream | Promise<Stream>;
  streamConfiguration?(): Stream | Promise<Stream>;
}

export interface IDestinationProvider extends IProvider {
  /**
   * Optional rollback implementation
   */
  rollback?<T extends Error = Error>(e: T): void | Promise<void>;

  // Getters for the destination's transfer streams
  getEntitiesStream?(): Stream | Promise<Stream>;
  getLinksStream?(): Stream | Promise<Stream>;
  getMediaStream?(): Stream | Promise<Stream>;
  getConfigurationStream?(): Stream | Promise<Stream>;
}
