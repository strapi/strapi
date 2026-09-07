import type { Clock, Journal, JournalEntry } from './types.ts';

/**
 * The write journal.
 *
 * This action does not roll back. A run that dies halfway leaves the repository half-changed and a
 * human finishes or reverts it, which is only acceptable if the run says exactly what it did. Every
 * mutation is recorded before the next one starts, and the journal is written to the step summary
 * and uploaded as an artifact even when the run fails.
 *
 * A dry run fills the same structure without calling the API, which is the rehearsal: a reviewable,
 * line-by-line list of every milestone rename, pull request reassignment and ref push the real run
 * would perform.
 */
export function createJournal(options: { apply: boolean; clock?: Clock }): Journal {
  const clock = options.clock ?? ((): string => new Date().toISOString());
  const mode = options.apply === true ? 'applied' : 'planned';
  const entries: JournalEntry[] = [];

  return {
    mode,

    async write(intent, perform) {
      entries.push({
        op: intent.op,
        target: intent.target,
        before: intent.before ?? null,
        after: intent.after ?? null,
        detail: intent.detail ?? null,
        at: clock(),
        applied: options.apply,
      });

      if (options.apply === false) {
        return null;
      }

      return perform();
    },

    entries() {
      return entries.slice();
    },

    toJSON() {
      return { mode, entries: entries.slice() };
    },
  };
}
