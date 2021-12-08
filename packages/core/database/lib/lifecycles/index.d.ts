import { Database } from '../';
import { Model } from '../schema';
import { Subscriber } from './subscribers';

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
}

export interface LifecycleProvider {
  subscribe(subscriber: Subscriber): () => void;
  clear(): void;
  run(action: Action, uid: string, properties: any): Promise<void>;
  createEvent(action: Action, uid: string, properties: any): Event;
}

export function createLifecyclesProvider(db: Database): LifecycleProvider;
