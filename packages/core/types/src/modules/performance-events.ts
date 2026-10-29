import type * as EventHub from './event-hub';

/** Stable API for plugins to consume `performance.*` hub events without coupling to hub internals. */
export interface PerformanceEventsPublicApi {
  readonly schemaVersion: 1;
  subscribe(eventName: string, listener: EventHub.Listener): () => void;
  getSchemaVersion(): 1;
  getCapabilities(): {
    schemaVersion: 1;
    events: readonly string[];
  };
}
