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
