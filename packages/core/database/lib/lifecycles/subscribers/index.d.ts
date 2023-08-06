import { Event, BeforeEvent, AfterEvent, BeforeAction, AfterAction } from '../';

type SubscriberFn<T> = (event: T) => Promise<void> | void;

type BaseSubscriberMap = { models?: string[] };
type BeforeSubscriberMap = { [k in BeforeAction]?: SubscriberFn<BeforeEvent> };
type AfterSubscriberMap = { [k in AfterAction]?: SubscriberFn<AfterEvent> };

type SubscriberMap = BaseSubscriberMap & BeforeSubscriberMap & AfterSubscriberMap;

export type Subscriber = SubscriberFn<Event> | SubscriberMap;
