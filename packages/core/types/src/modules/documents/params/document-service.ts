import { Common } from '../../..';
import { Pick } from '.';

/**
 * Document Service specific method params
 */
export type FindMany<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination:offset'
  | 'sort'
  | 'populate'
  | 'status'
  | 'locale'
  | 'plugin'
>;

export type FindFirst<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'filters' | '_q' | 'sort' | 'populate' | 'status' | 'locale' | 'plugin'
>;

export type FindOne<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale' | 'sort'
>;

export type Delete<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale'
>;

export type DeleteMany<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination:offset'
  | 'sort'
  | 'populate'
  | 'status'
  | 'locale'
  | 'plugin'
>;

export type Create<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'files' | 'fields' | 'populate' | 'status' | 'locale'
>;

export type Clone<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'files' | 'fields' | 'populate' | 'status' | 'locale'
>;

export type Update<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'data:partial' | 'files' | 'fields' | 'populate' | 'status' | 'locale'
>;

export type Count<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination:offset'
  | 'sort'
  | 'populate'
  | 'status'
  | 'locale'
  | 'plugin'
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Publish<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'status' | 'locale'
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Unpublish<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'status' | 'locale'
>;
