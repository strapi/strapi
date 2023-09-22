import type { Utils } from '../../../types';

export type PageNotation = {
  page?: number;
  pageSize?: number;
};

export type OffsetNotation = {
  start?: number;
  limit?: number;
};

export type Any = Utils.XOR<PageNotation, OffsetNotation>;
