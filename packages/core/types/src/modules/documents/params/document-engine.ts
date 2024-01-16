import { Pick } from '.';
import { Common } from '../../..';

// TODO: add auth to params

/**
 * Document Service specific method params
 */
export type FindMany<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination'
  | 'sort'
  | 'populate'
  | 'status'
  | 'locale'
  | 'plugin'
  | 'lookup'
>;

export type Count<TContentTypeUID extends Common.UID.ContentType> = FindMany<TContentTypeUID>;

export type FindFirst<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'filters' | '_q' | 'sort' | 'populate' | 'status' | 'locale' | 'plugin' | 'lookup'
>;

export type FindOne<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale' | 'sort' | 'lookup'
>;

export type Delete<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale' | 'lookup'
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
  | 'lookup'
>;

export type Create<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'files' | 'fields' | 'populate' | 'locale' | 'lookup'
>;

export type Clone<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'files' | 'fields' | 'populate' | 'status' | 'locale' | 'lookup'
>;

export type Update<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'data:partial' | 'files' | 'fields' | 'populate' | 'locale' | 'lookup'
>;

export type Publish<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
>;

export type Unpublish<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
>;

export type DiscardDraft<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
>;

export type With<TContentTypeUID extends Common.UID.ContentType> = Pick<
  TContentTypeUID,
  | 'filters'
  | 'status'
  | 'locale'
  | 'fields'
  | '_q'
  | 'pagination:offset'
  | 'sort'
  | 'populate'
  | 'status'
  | 'locale'
  | 'plugin'
  | 'lookup'
>;
