import { Readable, Writable, Duplex, Transform } from 'stream';

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
