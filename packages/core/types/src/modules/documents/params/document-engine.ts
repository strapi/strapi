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
  | 'sort'
  | 'populate'
  | 'status'
  | 'locale:string'
  | 'locale:array'
  | 'plugin'
  | 'lookup'
>;

export type Count<TContentTypeUID extends UID.ContentType> = FindMany<TContentTypeUID>;

export type FindFirst<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'sort'
  | 'populate'
  | 'status'
  | 'locale:string'
  | 'plugin'
  | 'lookup'
>;

export type FindOne<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale:string' | 'sort' | 'lookup'
>;

export type Delete<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale:string' | 'lookup'
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
  | 'locale:string'
  | 'plugin'
  | 'lookup'
>;

export type Create<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'fields' | 'populate' | 'locale:string' | 'lookup' | 'status'
>;

export type Clone<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'fields' | 'populate' | 'status' | 'locale:string' | 'lookup'
>;

export type Update<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data:partial' | 'fields' | 'populate' | 'locale:string' | 'lookup'
>;

export type Publish<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale:string' | 'locale:array' | 'lookup'
>;

export type Unpublish<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale:string' | 'locale:array' | 'lookup'
>;

export type DiscardDraft<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale:string' | 'lookup'
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
  | 'locale:string'
  | 'plugin'
  | 'lookup'
>;
