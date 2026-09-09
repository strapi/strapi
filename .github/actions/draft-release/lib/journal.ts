import type { Clock, Journal, JournalEntry, JournalEntryState } from './types.ts';

/**
 * Whether a rejected write proves that nothing was mutated.
 *
 * Both adapters attach the numeric status they got back, and each one means the operation ran to a
 * verdict: a GitHub response status is the server refusing the write, and a git exit code is git
 * reporting a ref it did not update, which it does atomically. An error carrying no status proves
 * nothing either way. A socket closed after the request left is the case that matters, because the
 * mutation may well have been applied on the other side.
 */
export function classifyFailure(
  error: unknown
): Extract<JournalEntryState, 'failed' | 'indeterminate'> {
  const status = (error as { status?: unknown } | null | undefined)?.status;

  return typeof status === 'number' ? 'failed' : 'indeterminate';
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
export function createJournal(options: { apply: boolean; clock?: Clock }): Journal {
  const clock = options.clock ?? ((): string => new Date().toISOString());
  const mode = options.apply === true ? 'applied' : 'planned';
  const entries: JournalEntry[] = [];

  return {
    mode,

    async write(intent, perform) {
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

      if (options.apply === false) {
        return null;
      }

      try {
        const result = await perform();

        entry.state = 'applied';

        return result;
      } catch (error) {
        entry.state = classifyFailure(error);
        entry.error = error instanceof Error ? error.message : String(error);

        throw error;
      }
    },

    entries() {
      return entries.slice();
    },

    toJSON() {
      return { mode, entries: entries.slice() };
    },
  };
}
