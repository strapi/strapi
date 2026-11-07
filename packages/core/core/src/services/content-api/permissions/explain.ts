import type { ExplainEntry } from '@strapi/utils';

/**
 * What the permission checks did to one request, for explain mode.
 *
 * It is kept per compiled permissions: an ability is built for each request, so one entry of this
 * map is one request's story, and it is collected with the request. The checker is the only writer;
 * the end-users plugin's middleware reads it once the response is built.
 */
interface Collected {
  /** Whether a check asked the caller's rows anything: false is a route that skipped them */
  checked: boolean;
  entries: Map<string, ExplainEntry>;
}

/**
 * A request that records more distinct entries than this is not telling a more useful story: the
 * rest are dropped, so the list never grows with the data a request reads
 */
const MAX_ENTRIES = 500;

const collected = new WeakMap<object, Collected>();

const stateOf = (key: object): Collected => {
  let state = collected.get(key);

  if (state === undefined) {
    state = { checked: false, entries: new Map() };
    collected.set(key, state);
  }

  return state;
};

/** What makes two entries the same: every field they can differ by, `roles` and `conditions` aside */
const keyOf = (entry: ExplainEntry) => {
  const { kind, uid, action, at, path, target, reason, route } = entry as Record<string, unknown>;

  return [kind, uid, action, at, path, target, reason, route].join('\u0000');
};

/** Notes that a check ran for this request */
export const markChecked = (key: object) => {
  stateOf(key).checked = true;
};

/**
 * Records an entry once: a list of a thousand entries that each lose the same field is one entry.
 * `complete` fills in what the sanitizers can't know (the roles and conditions behind a filter) and
 * only runs for an entry that is new.
 */
export const record = (
  key: object,
  entry: ExplainEntry,
  complete: (entry: ExplainEntry) => ExplainEntry = (value) => value
) => {
  const state = stateOf(key);
  const entryKey = keyOf(entry);

  // A check that has something to say has run
  state.checked = true;

  if (state.entries.has(entryKey) || state.entries.size >= MAX_ENTRIES) {
    return;
  }

  state.entries.set(entryKey, complete(entry));
};

/** What was recorded for this request, in the order it was recorded. Copies; nothing leaks */
export const read = (key: object | null): { checked: boolean; entries: ExplainEntry[] } => {
  const state = key === null ? undefined : collected.get(key);

  if (state === undefined) {
    return { checked: false, entries: [] };
  }

  return {
    checked: state.checked,
    entries: [...state.entries.values()].map((entry) => structuredClone(entry)),
  };
};
