import type { Readable, Writable, Duplex, Transform } from 'stream';
import type { IDestinationProvider, ISourceProvider } from './providers';

/**
 * Define a transfer transform which will be used to intercept
 * and potentially discard or modify the transferred data
 */
export type TransferTransform<T> =
  | {
      filter: (data: T) => boolean;
    }
  | {
      map: (data: T) => T;
    };

export type TransformFunction = (chunk: any, encoding?: string) => any;
export type StreamItem = Stream | TransformFunction;
type Stream = Readable | Writable | Duplex | Transform;

export type TransferStage = 'entities' | 'links' | 'assets' | 'schemas' | 'configuration';

export type TransferProgress = {
  [key in TransferStage]?: {
    count: number;
    bytes: number;
    aggregates?: {
      [key: string]: {
        count: number;
        bytes: number;
      };
    };
  };
};

export interface ITransferResults<S extends ISourceProvider, D extends IDestinationProvider> {
  source?: S['results'];
  destination?: D['results'];
  engine?: TransferProgress;
}

// There aren't currently any universal results provided but there likely will be in the future, so providers that have their own results should extend from these to be safe
export type IProviderTransferResults = {};
export type ISourceProviderTransferResults = {};
export type IDestinationProviderTransferResults = {};
