import { Event, Action } from '../';

type SubscriberFn = (event: Event) => Promise<void> | void;

type SubscriberActions = {
  [key in Action]?: SubscriberFn;
};

interface SubscriberMap extends SubscriberActions {
  models?: [],
}

export type Subscriber = SubscriberFn | SubscriberMap;
