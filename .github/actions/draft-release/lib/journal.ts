import type { Clock, Journal, JournalEntry, JournalEntryState, JournalSnapshot } from './types.ts';

const MUTATION_FAILURE_OUTCOMES = ['refused', 'unknown'] as const;

type MutationFailureOutcome = (typeof MUTATION_FAILURE_OUTCOMES)[number];

/**
 * Creates an adapter error that states whether a rejected mutation is known not to have landed.
 */
export function mutationFailure(message: string, outcome: MutationFailureOutcome): Error {
  return Object.assign(new Error(message), { mutationFailureOutcome: outcome });
}

/**
 * Whether a rejected write proves that nothing was mutated.
 *
 * Adapters mark only failures that prove the mutation was refused. An untyped error, or a typed
 * failure whose remote outcome is unknown, remains indeterminate.
 */
export function classifyFailure(
  error: unknown
): Extract<JournalEntryState, 'failed' | 'indeterminate'> {
  const outcome = (error as { mutationFailureOutcome?: unknown } | null | undefined)
    ?.mutationFailureOutcome;

  return outcome === 'refused' ? 'failed' : 'indeterminate';
}

/**
 * The write journal.
 *
 * This action does not roll back. A run that dies halfway leaves the repository half-changed and a
 * human finishes or reverts it, which is only acceptable if the run says exactly what it did. Every
 * mutation is recorded before it is attempted, and the journal is written to the step summary and
 * uploaded as an artifact even when the run fails.
 *
 * The entry is mutated in place as the write progresses, so an entry never claims more certainty
 * than the run has: `attempted` until the call returns, then `applied`, `failed` or
 * `indeterminate`. Only an `applied` entry is worth undoing.
 *
 * A dry run fills the same structure without calling the API, which is the rehearsal: a reviewable,
 * line-by-line list of every milestone rename, pull request reassignment and ref push the real run
 * would perform. Its entries stay `planned`.
 */
export function createJournal(options: {
  apply: boolean;
  clock?: Clock;
  persist?: (snapshot: JournalSnapshot) => void;
}): Journal {
  const clock = options.clock ?? ((): string => new Date().toISOString());
  const mode = options.apply === true ? 'applied' : 'planned';
  const entries: JournalEntry[] = [];
  const snapshot = (): JournalSnapshot => ({ mode, entries: entries.slice() });
  const persist = (): void => options.persist?.(snapshot());

  return {
    mode,

    async write(intent, perform, recordResult) {
      const entry: JournalEntry = {
        op: intent.op,
        target: intent.target,
        before: intent.before ?? null,
        after: intent.after ?? null,
        detail: intent.detail ?? null,
        at: clock(),
        state: options.apply === true ? 'attempted' : 'planned',
        error: null,
      };

      entries.push(entry);
      persist();

      if (options.apply === false) {
        return null;
      }

      try {
        const result = await perform();

        if (recordResult !== undefined) {
          Object.assign(entry, recordResult(result));
        }

        entry.state = 'applied';
        persist();

        return result;
      } catch (error) {
        entry.state = classifyFailure(error);
        entry.error = error instanceof Error ? error.message : String(error);
        persist();

        throw error;
      }
    },

    entries() {
      return entries.slice();
    },

    toJSON() {
      return snapshot();
    },
  };
}
