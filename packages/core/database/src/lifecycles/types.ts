import type { Model } from '../metadata/types';

export type Action =
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeFindOne'
  | 'afterFindOne'
  | 'beforeFindMany'
  | 'afterFindMany'
  | 'beforeCount'
  | 'afterCount'
  | 'beforeCreateMany'
  | 'afterCreateMany'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeUpdateMany'
  | 'afterUpdateMany'
  | 'beforeDelete'
  | 'afterDelete'
  | 'beforeDeleteMany'
  | 'afterDeleteMany';

export interface Params {
  select?: any;
  where?: any;
  _q?: any;
  orderBy?: any;
  groupBy?: any;
  offset?: any;
  limit?: any;
  populate?: any;
  data?: any;
}

export interface Event {
  action: Action;
  model: Model;
  params: Params;
  state: Record<string, unknown>;
}

type SubscriberFn = (event: Event) => Promise<void> | void;

export type SubscriberMap = {
  models?: string[];
} & Partial<Record<Action, SubscriberFn>>;

export type Subscriber = SubscriberFn | SubscriberMap;
