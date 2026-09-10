import type { MessageDescriptor } from 'react-intl';

/**
 * Extension point: plugins can put the Content-Type Builder in read-only mode
 * from runtime context (e.g. "the schema is managed from another workspace").
 * The schema stays browsable; every editing surface behaves as it does in
 * production mode, and the rule's `reason` is shown to the user.
 *
 * Each registration is a **custom hook** returning the rule's state — the hook
 * runs inside the data manager provider, so rules may subscribe to reactive
 * data. Registration happens during plugin `register`/`bootstrap`, before the
 * first render, so the hook list is stable and the rules of hooks hold. Mirrors
 * the admin's `registerMenuMutator`.
 */
interface ReadOnlyState {
  readOnly: boolean;
  /** Shown as a notification when `readOnly` is true. */
  reason?: MessageDescriptor;
}

interface ReadOnlyRule {
  id: string;
  useRule: () => ReadOnlyState;
}

const readOnlyRules: ReadOnlyRule[] = [];

const registerReadOnlyRule = (rule: ReadOnlyRule): void => {
  const index = readOnlyRules.findIndex((item) => item.id === rule.id);
  if (index === -1) {
    readOnlyRules.push(rule);
  } else {
    readOnlyRules[index] = rule;
  }
};

const getReadOnlyRules = (): readonly ReadOnlyRule[] => readOnlyRules;

/** The first read-only rule wins; `{ readOnly: false }` when none applies. */
const useReadOnlyRules = (): ReadOnlyState => {
  const states = getReadOnlyRules().map((rule) => rule.useRule());

  return states.find((state) => state.readOnly) ?? { readOnly: false };
};

export { registerReadOnlyRule, getReadOnlyRules, useReadOnlyRules };
export type { ReadOnlyRule, ReadOnlyState };
