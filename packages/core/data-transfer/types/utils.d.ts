/* eslint-disable @typescript-eslint/ban-types */
import type { Readable, Writable, Duplex, Transform } from 'stream';
import type { Schema } from '@strapi/strapi';
import type { KnexTransaction } from 'knex';
import type { IDestinationProvider, ISourceProvider } from './providers';
import type { IAsset, IEntity, ILink } from './common-entities';

export type MaybePromise<T> = T | Promise<T>;

// The data type passed in for each stage
export type TransferStageTypeMap = {
  schemas: Schema;
  entities: IEntity;
  links: ILink;
  assets: IAsset;
  configuration: unknown;
};

/**
 * Define a transfer transform which will be used to intercept
 * and potentially discard or modify the transferred data
 */
export type TransferTransform<T> = TransferFilter<T> | TransferMap<T>;

export type TransferFilter<T> = {
  filter: (data: T) => boolean;
};

export type TransferMap<T> = {
  map: (data: T) => T;
};

export type Stream = Readable | Writable | Duplex | Transform;
export type TransformFunction = (chunk: any, encoding?: string) => any;
export type StreamItem = Stream | TransformFunction;

export type TransferTransformsTypeMap = TransferStageTypeMap & {
  global: unknown;
};

export type TransferStage = keyof TransferStageTypeMap;

export type TransferTransformArray<T> = TransferTransform<TransferStageTypeMap[T]>[];

export type TransferTransformOption = keyof TransferTransformsTypeMap;

export type TransferTransforms = {
  [key in TransferTransformOption]?: TransferTransformArray<key>;
};

/*
 * Filters
 */
export type TransferFilterArray<T> = TransferFilter<TransferStageTypeMap[T]>[];

export type TransferFilters = {
  [key in TransferTransformOption]?: boolean | TransferFilterArray<key>;
};

/*
 * Progress
 */
export type TransferProgress = {
  [key in TransferStage]?: {
    count: number;
    bytes: number;
    startTime: number;
    endTime?: number;
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

export type { KnexTransaction };
export type TransactionCallback = (trx?: KnexTransaction) => Promise<void>;
export type Transaction = {
  attach<T = undefined>(callback: TransactionCallback): Promise<T | undefined>;
  end(): boolean;
  rollback(): Promise<boolean>;
};
