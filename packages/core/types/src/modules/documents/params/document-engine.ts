import type * as UID from '../../../uid';

import { Pick } from '.';

// TODO: add auth to params

/**
 * Document Service specific method params
 */
export type FindMany<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination'
  | 'populate'
  | 'status'
  | 'locale'
  | 'plugin'
  | 'lookup'
>;

export type Count<TContentTypeUID extends UID.ContentType> = FindMany<TContentTypeUID>;

export type FindFirst<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'filters' | '_q' | 'sort' | 'populate' | 'status' | 'locale' | 'plugin' | 'lookup'
>;

export type FindOne<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale' | 'sort' | 'lookup'
>;

export type Delete<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale' | 'lookup'
>;

export type DeleteMany<TContentTypeUID extends UID.ContentType> = Pick<
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

export type Create<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'files' | 'fields' | 'populate' | 'locale' | 'lookup'
>;

export type Clone<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'files' | 'fields' | 'populate' | 'status' | 'locale' | 'lookup'
>;

export type Update<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data:partial' | 'files' | 'fields' | 'populate' | 'locale' | 'lookup'
>;

export type Publish<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
>;

export type Unpublish<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
>;

export type DiscardDraft<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
>;

export type With<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  | 'filters'
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
