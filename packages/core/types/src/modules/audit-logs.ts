/**
 * Where an audited action comes from.
 * 'scheduler' refers to the execution mechanism, so any scheduled job can use it.
 */
export type AuditSource = 'admin-panel' | 'mcp' | 'scheduler';

/**
 * Origins where no user is expected to be present.
 * New AuditSource values must be added here to be treated as system actions.
 */
export type SystemOrigin = 'scheduler';

/**
 * Who performed the action.
 * The subscriber builds this from the request context; emitters and transformers
 * don't provide it. Actions from a system origin are recorded as 'system'; actions
 * from a request with no authenticated user (a public admin form) as 'unknown',
 * for the events that allow it.
 */
export type Actor =
  | { type: 'admin-user'; user: { id: string | number; email: string; name: string } }
  | { type: 'system' }
  | { type: 'unknown' };

/**
 * The resource the action was performed on.
 * `type` is the audit-log name for the resource (e.g. 'release').
 *
 * A resource with its own stable identifier extends this in the package that owns it,
 * rather than adding a field here that only one resource fills in.
 */
export interface Resource {
  type: string;
  id?: string | number;
  name?: string;
}

/** `partial`: the action was carried out for only some of its items (e.g. a release run) */
export type Outcome = 'success' | 'partial' | 'failure';

/**
 * A field's value on either side of a change, as recorded under `details.changes`.
 */
export interface FieldChange<T = string | number | boolean | null> {
  before: T;
  after: T;
}

/**
 * The shape returned by an event transformer.
 * The subscriber adds action, date, actor and origin.
 */
export interface EventShape<TDetails = unknown, TResource extends Resource = Resource> {
  // Absent when there is no known resource, e.g. a failed login for an unknown account.
  resource?: TResource;
  details?: TDetails;
  // Only present when the action can fail (e.g. publish).
  outcome?: Outcome;
}

/**
 * The payload stored for a standard audit event.
 * action and date are also stored as table columns, but are repeated here so
 * the payload can be used on its own when exported or forwarded to another system.
 */
export interface StoredPayload<
  TDetails = unknown,
  TResource extends Resource = Resource,
> extends EventShape<TDetails, TResource> {
  action: string;
  date: string;
  actor: Actor;
  origin: AuditSource;
}

/**
 * Builds the audited data for an event emitted through eventHub.emit().
 * Registered by the plugin that owns the event.
 *
 * May be async when the resource needs to be fetched. Deleted rows and previous
 * values must be included in the emitted event instead.
 */
export type EventTransformer<TDetails = unknown, TResource extends Resource = Resource> = (
  ...args: any[]
) => EventShape<TDetails, TResource> | Promise<EventShape<TDetails, TResource>>;

/** How the audit log records a registered event. */
export interface RegisterEventOptions {
  /**
   * Records the event when the request has no authenticated user, with an `unknown` actor. For
   * actions taken from public admin forms (password reset, invitation). Off by default: an event
   * with no user is dropped.
   */
  allowUnknownActor?: boolean;
  /**
   * Records the event with an `unknown` actor even when the request has an authenticated user. For
   * events about a login that did not complete.
   */
  alwaysUnknownActor?: boolean;
  /**
   * Receives the arguments passed to `eventHub.emit()`; returning `false` keeps the event out of the
   * audit log. Listeners on the event hub still receive it.
   */
  shouldRecord?: (...args: never[]) => boolean;
  /** The action stored in the row, when it is not the event name. */
  action?: string;
}

/**
 * `strapi.get('audit-logs-lifecycle')`, added by `@strapi/admin` when audit logs are enabled (EE).
 * Packages register the events they audit from their bootstrap.
 */
export interface AuditLogsLifecycleService {
  /**
   * Audits the event `name`: `transform` builds the audited shape from the arguments passed to
   * `eventHub.emit()`. Replaces an event registered under the same name; throws for a built-in event.
   */
  registerEvent<TDetails = unknown>(
    name: string,
    transform: EventTransformer<TDetails>,
    options?: RegisterEventOptions
  ): void;
  /** Subscribes to the event hub when the license enables audit logs, and follows license changes. */
  register(): Promise<AuditLogsLifecycleService>;
  unsubscribe(): AuditLogsLifecycleService;
  destroy(): AuditLogsLifecycleService;
}
