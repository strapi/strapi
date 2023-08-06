import { Database } from '../';
import { Model } from '../schema';
import { Subscriber } from './subscribers';

export type BeforeAction =
  | 'beforeCreate'
  | 'beforeFindOne'
  | 'beforeFindMany'
  | 'beforeCount'
  | 'beforeCreateMany'
  | 'beforeUpdate'
  | 'beforeUpdateMany'
  | 'beforeDelete'
  | 'beforeDeleteMany';

export type AfterAction =
  | 'afterCreate'
  | 'afterFindOne'
  | 'afterFindMany'
  | 'afterCount'
  | 'afterCreateMany'
  | 'afterUpdate'
  | 'afterUpdateMany'
  | 'afterDelete'
  | 'afterDeleteMany';

export type Action = BeforeAction | AfterAction;

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

export interface BaseEvent {
  action: Action;
  model: Model;
  params: Params;
  state: Record<string, any>;
}

export interface BeforeEvent extends BaseEvent {
  action: BeforeAction;
}

export interface AfterEvent extends BaseEvent {
  action: AfterAction;
  result: Record<string, any>;
}

export type Event = BeforeEvent | AfterEvent;

export interface LifecycleProvider {
  subscribe(subscriber: Subscriber): () => void;
  clear(): void;
  run(action: Action, uid: string, properties: any): Promise<Map<any, any>>;
  run(action: Action, uid: string, properties: any, states: Map<any, any>): Promise<Map<any, any>>;
  createEvent(action: Action, uid: string, properties: any): Event;
}

export function createLifecyclesProvider(db: Database): LifecycleProvider;
