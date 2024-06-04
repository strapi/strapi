import type * as UID from '../../../uid';

import { Pick } from '.';
import { ID } from '..';

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
  | 'locale'
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
> & {
  documentId: ID;
};

export type Delete<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale:string' | 'lookup'
> & {
  documentId: ID;
};

export type Create<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'fields' | 'populate' | 'locale:string' | 'lookup' | 'status'
>;

export type Clone<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'fields' | 'populate' | 'status' | 'locale:string' | 'lookup'
> & {
  documentId: ID;
};

export type Update<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data:partial' | 'fields' | 'populate' | 'locale:string' | 'lookup'
> & {
  documentId: ID;
};

export type Publish<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
> & {
  documentId: ID;
};

export type Unpublish<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale:string' | 'lookup'
> & {
  documentId: ID;
};

export type DiscardDraft<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
> & {
  documentId: ID;
};
