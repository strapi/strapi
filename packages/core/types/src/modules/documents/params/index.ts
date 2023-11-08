import { Common } from '../../..';
import * as Params from '../../entity-service/params';

// Export params list
export * from '../../entity-service/params';

export type FindMany<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination:offset'
  | 'sort'
  | 'populate'
  | 'publicationState'
  | 'plugin'
>;

export type FindFirst<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  'fields' | 'filters' | '_q' | 'sort' | 'populate' | 'publicationState' | 'plugin'
>;

export type FindOne<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'sort'
>;

export type Delete<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters'
>;

export type DeleteMany<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination:offset'
  | 'sort'
  | 'populate'
  | 'publicationState'
  | 'plugin'
>;

export type Create<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  'data' | 'files' | 'fields' | 'populate'
>;

export type Clone<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  'data' | 'files' | 'fields' | 'populate'
>;

export type Update<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  'data:partial' | 'files' | 'fields' | 'populate'
>;

export type Count<TContentTypeUID extends Common.UID.ContentType> = Params.Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination:offset'
  | 'sort'
  | 'populate'
  | 'publicationState'
  | 'plugin'
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Publish<TContentTypeUID extends Common.UID.ContentType> = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Unpublish<TContentTypeUID extends Common.UID.ContentType> = Record<string, any>;
