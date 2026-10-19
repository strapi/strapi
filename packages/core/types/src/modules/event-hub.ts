import type { SuggestedString } from '../utils/string';

export type Subscriber = (eventName: string, ...args: any[]) => Promise<void>;
export type Listener = (...args: any[]) => Promise<void>;

export interface EventHub {
  emit(eventName: string, ...args: unknown[]): Promise<void>;
  subscribe(subscriber: Subscriber): () => void;
  unsubscribe(subscriber: Subscriber): void;
  on(eventName: string, listener: Listener): () => void;
  off(eventName: string, listener: Listener): void;
  once(eventName: string, listener: Listener): () => void;
  destroy(): EventHub;
  removeListener(eventName: string, listener: Listener): void;
  removeAllListeners(): EventHub;
  removeAllSubscribers(): EventHub;
  addListener(eventName: string, listener: Listener): () => void;
}

/** Event names that have a registered payload. */
export type RegisteredEventName = keyof Strapi.Registries.Events;

/** The registered tuple of `TName`. A registered value that is not a tuple takes no arguments. */
type RegisteredArgs<TName extends RegisteredEventName> =
  Strapi.Registries.Events[TName] extends infer TArgs extends unknown[] ? TArgs : [];

/** An event name accepted by the event hub. Registered names are listed for completion. */
export type EventLookupName = SuggestedString<RegisteredEventName>;

/**
 * The arguments an emit of `TName` passes after the name: the registered tuple. Unregistered and wide
 * names (`string`) take any arguments, as without strict types: nothing defines an event at runtime.
 */
export type EventArgs<TName extends string> = [TName] extends [RegisteredEventName]
  ? RegisteredArgs<TName & RegisteredEventName>
  : unknown[];

/**
 * A listener of `TName`. It receives the registered tuple, which holds every payload the producers of
 * the name pass. Its result is ignored: the hub awaits it, then runs the next listener. Unregistered
 * and wide names keep the listener they have without strict types.
 */
export type EventListener<TName extends string> = [TName] extends [RegisteredEventName]
  ? (...args: RegisteredArgs<TName & RegisteredEventName>) => unknown
  : Listener;

/**
 * The event hub, `strapi.eventHub`, with strict types enabled.
 *
 * Names and payloads are read through the {@link Strapi.Registries.Events} registry. An emit of a
 * registered name takes one of its registered payloads, and its listeners receive them. The runtime
 * runs any emit, but a payload off the contract would reach listeners, such as webhooks and audit
 * logs, that read the registered shape. Unregistered names keep the types they have without strict
 * types.
 *
 * Subscribers (`subscribe`) receive every event, registered or not, so they keep any arguments.
 */
export interface StrictEventHub extends Omit<
  EventHub,
  'emit' | 'on' | 'off' | 'once' | 'removeListener' | 'addListener'
> {
  /** Runs the listeners of `eventName`, then every subscriber, one at a time, with `args`. */
  emit<const TName extends EventLookupName>(
    eventName: TName,
    ...args: EventArgs<TName>
  ): Promise<void>;
  /** Adds a listener of `eventName`. Returns the function that removes it. */
  on<const TName extends EventLookupName>(
    eventName: TName,
    listener: EventListener<TName>
  ): () => void;
  /** Adds a listener of `eventName`, removed after its first call. Returns the function that removes it. */
  once<const TName extends EventLookupName>(
    eventName: TName,
    listener: EventListener<TName>
  ): () => void;
  /** Same as `on`. */
  addListener<const TName extends EventLookupName>(
    eventName: TName,
    listener: EventListener<TName>
  ): () => void;
  /** Removes a listener of `eventName`. It needs the function given to `on`. */
  off<const TName extends EventLookupName>(eventName: TName, listener: EventListener<TName>): void;
  /** Same as `off`. */
  removeListener<const TName extends EventLookupName>(
    eventName: TName,
    listener: EventListener<TName>
  ): void;
}
