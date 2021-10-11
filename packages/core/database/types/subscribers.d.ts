import { Event, Action } from './lifecycles';

export type SubscriberFn = (event: Event) => Promise<void> | void;

export type SubscriberMap = {
  [k in Action]: SubscriberFn;
};

export type Subscriber = SubscriberFn | SubscriberMap;
