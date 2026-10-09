type UnsavedChangesCheck = () => boolean;

const checks = new Map<string, UnsavedChangesCheck>();

/**
 * Register a callback that reports whether a form (or other surface) has unsaved
 * edits. Used by the auth layer to warn before session-expiry logout discards
 * in-memory state that route blockers never see (token clear unmounts the form).
 */
const registerUnsavedChangesCheck = (id: string, check: UnsavedChangesCheck): (() => void) => {
  checks.set(id, check);

  return () => {
    checks.delete(id);
  };
};

const hasUnsavedChanges = (): boolean => {
  for (const check of checks.values()) {
    if (check()) {
      return true;
    }
  }

  return false;
};

const clearUnsavedChangesChecks = (): void => {
  checks.clear();
};

export { registerUnsavedChangesCheck, hasUnsavedChanges, clearUnsavedChangesChecks };
export type { UnsavedChangesCheck };
