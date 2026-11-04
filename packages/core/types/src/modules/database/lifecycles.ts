import type { Meta } from './metadata';

/** @internal Public through `@strapi/database` only. */
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

/** @internal Public through `@strapi/database` only. */
export interface LifecycleParams {
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

/** @internal Public through `@strapi/database` only. */
export interface Event {
  action: Action;
  model: Meta;
  params: LifecycleParams;
  state: Record<string, unknown>;
  result?: any;
}

/** @internal Public through `@strapi/database` only. */
export type SubscriberFn = (event: Event) => Promise<void> | void;

/** @internal Public through `@strapi/database` only. */
export type SubscriberMap = {
  models?: string[];
} & Partial<Record<Action, SubscriberFn>>;

/** @internal Public through `@strapi/database` only. */
export type Subscriber = SubscriberFn | SubscriberMap;

/** @internal Public through `@strapi/database` only. */
export type LifecycleState = Record<string, unknown>;

/** @internal Public through `@strapi/database` only. */
export type LifecycleStates = Map<Subscriber, LifecycleState>;

/** @internal Public through `@strapi/database` only. */
export interface LifecycleProperties {
  params: LifecycleParams;
  result?: unknown;
}

/** @internal Public through `@strapi/database` only. */
export interface LifecycleProvider {
  subscribe(subscriber: Subscriber): () => void;
  clear(): void;
  run(
    action: Action,
    uid: string,
    properties: LifecycleProperties,
    states?: LifecycleStates
  ): Promise<LifecycleStates>;
  hasSubscribers(action: Action, uid: string): boolean;
  createEvent(
    action: Action,
    uid: string,
    properties: LifecycleProperties,
    state: LifecycleState
  ): Event;
  disable(): void;
  enable(): void;
}
