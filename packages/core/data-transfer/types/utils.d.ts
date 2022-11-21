import type { Readable, Writable, Duplex, Transform } from 'stream';
import type { IDestinationProvider, ISourceProvider } from './providers';

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

export interface AddedDiff<T = unknown> {
  kind: 'added';
  path: string[];
  type: string;
  value: T;
}

export interface ModifiedDiff<T = unknown, P = unknown> {
  kind: 'modified';
  path: string[];
  types: [string, string];
  values: [T, P];
}

export interface DeletedDiff<T = unknown> {
  kind: 'deleted';
  path: string[];
  type: string;
  value: T;
}

export type Diff = AddedDiff | ModifiedDiff | DeletedDiff;

export interface Context {
  path: string[];
}
export type TransferStage = 'entities' | 'links' | 'media' | 'schemas' | 'configuration';

export interface ITransferResults<S extends ISourceProvider, D extends IDestinationProvider> {
  source?: S['results'];
  destination?: D['results'];
}

// There aren't currently any universal results provided but there likely will be in the future, so providers that have their own results should extend from these to be safe
export type IProviderTransferResults = {};
export type ISourceProviderTransferResults = {};
export type IDestinationProviderTransferResults = {};
