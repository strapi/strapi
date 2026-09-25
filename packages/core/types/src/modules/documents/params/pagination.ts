import type { XOR } from '../../../utils';

export type PageNotation = {
  page?: number | undefined;
  pageSize?: number | undefined;
};

export type OffsetNotation = {
  start?: number | undefined;
  limit?: number | undefined;
};

export type Any = XOR<PageNotation, OffsetNotation>;
