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

/**
 * Extension point: plugins can take the Content-Type Builder away entirely,
 * rather than merely making it read-only — "the schema is defined in another
 * workspace, and this one has no business browsing it". The plugin is then
 * unreachable by URL as well as absent from the menu, because hiding the link
 * alone leaves the page one paste away.
 *
 * Same shape as the read-only rules above, and registered the same way.
 */
interface AvailabilityState {
  available: boolean;
}

interface AvailabilityRule {
  id: string;
  useRule: () => AvailabilityState;
}

const availabilityRules: AvailabilityRule[] = [];

const registerAvailabilityRule = (rule: AvailabilityRule): void => {
  const index = availabilityRules.findIndex((item) => item.id === rule.id);
  if (index === -1) {
    availabilityRules.push(rule);
  } else {
    availabilityRules[index] = rule;
  }
};

const getAvailabilityRules = (): readonly AvailabilityRule[] => availabilityRules;

/** Any rule saying "not here" wins; available when none applies. */
const useAvailabilityRules = (): AvailabilityState => {
  const states = getAvailabilityRules().map((rule) => rule.useRule());

  return states.find((state) => !state.available) ?? { available: true };
};

export { registerAvailabilityRule, getAvailabilityRules, useAvailabilityRules };
export type { AvailabilityRule, AvailabilityState };
