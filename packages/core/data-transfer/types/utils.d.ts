import { Readable, Writable, Duplex, Transform } from 'stream';
import { IDestinationProvider, ISourceProvider } from './providers';

/**
 * Default signature for transfer rules' filter methods
 */
type TransferRuleFilterSignature = (...params: unknown[]) => boolean;

/**
 * Define a transfer rule which will be used to intercept
 * and potentially modify the transferred data
 */
export interface ITransferRule<
  T extends TransferRuleFilterSignature = TransferRuleFilterSignature
> {
  /**
   * Filter method used to select which data should be transformed
   */
  filter?: T;
  /**
   * Transform middlewares which will be applied to the filtered data
   */
  transforms: StreamItem[];
}

export type TransformFunction = (chunk: any, encoding?: string) => any;
export type StreamItem = Stream | TransformFunction;
type Stream = Readable | Writable | Duplex | Transform;

export type TransferStage = 'entities' | 'links' | 'media' | 'schemas' | 'configuration';

export interface ITransferResults<S extends ISourceProvider, D extends IDestinationProvider> {
  source?: S['results'];
  destination?: D['results'];
}
