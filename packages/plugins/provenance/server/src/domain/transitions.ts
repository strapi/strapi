import type { Declaration, Source } from './types';

export const isAiSource = (source: Source | null) =>
  source === 'ai-generated' || source === 'ai-assisted';

/**
 * The source of a field after a write that changed its value.
 *
 * `previous` must already account for drift: pass `null` (or `unattributed`) when the stored
 * hash no longer matches the value that was overwritten.
 */
export const nextSource = (previous: Source | null, declaration: Declaration): Source => {
  switch (declaration.origin) {
    case 'ai':
      return declaration.edited ? 'ai-assisted' : 'ai-generated';
    case 'human':
      return isAiSource(previous) ? 'ai-assisted' : 'human-entered';
    // Whoever edits AI output last, it is still AI output
    case 'automated':
      return isAiSource(previous) ? 'ai-assisted' : 'automated';
    default:
      return isAiSource(previous) ? 'ai-assisted' : 'unattributed';
  }
};
