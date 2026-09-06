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
 * don't provide it. Actions without a user are recorded as 'system'.
 */
export type Actor =
  | { type: 'admin-user'; user: { id: string | number; email: string; name: string } }
  | { type: 'system' };

/**
 * The resource the action was performed on.
 * `type` is the audit-log name for the resource (e.g. 'release').
 */
export interface Resource {
  type: string;
  id?: string | number;
  name?: string;
}

export type Outcome = 'success' | 'failure';

/**
 * The shape returned by an event transformer.
 * The subscriber adds action, date, actor and origin.
 */
export interface EventShape<TDetails = unknown> {
  resource: Resource;
  details?: TDetails;
  // Only present when the action can fail (e.g. publish).
  outcome?: Outcome;
}

/**
 * The payload stored for a standard audit event.
 * action and date are also stored as table columns, but are repeated here so
 * the payload can be used on its own when exported or forwarded to another system.
 */
export interface StoredPayload<TDetails = unknown> extends EventShape<TDetails> {
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
export type EventTransformer<TDetails = unknown> = (
  ...args: any[]
) => EventShape<TDetails> | Promise<EventShape<TDetails>>;
