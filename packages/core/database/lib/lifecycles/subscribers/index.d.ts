import { Event, Action } from '../';

type SubscriberFn = (event: Event) => Promise<void> | void;

type SubscriberMap = {
  [k in Action]?: SubscriberFn;
};

interface ModelsSubscriberMap extends SubscriberMap {
  models: string[]
}

export type Subscriber = SubscriberFn | SubscriberMap | ModelsSubscriberMap;
