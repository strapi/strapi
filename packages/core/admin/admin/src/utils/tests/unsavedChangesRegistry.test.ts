import {
  clearUnsavedChangesChecks,
  hasUnsavedChanges,
  registerUnsavedChangesCheck,
} from '../unsavedChangesRegistry';

describe('unsavedChangesRegistry', () => {
  afterEach(() => {
    clearUnsavedChangesChecks();
  });

  it('returns false when no checks are registered', () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('returns true when any registered check reports unsaved changes', () => {
    registerUnsavedChangesCheck('a', () => false);
    registerUnsavedChangesCheck('b', () => true);

    expect(hasUnsavedChanges()).toBe(true);
  });

  it('stops reporting after unregistering', () => {
    const unregister = registerUnsavedChangesCheck('a', () => true);

    expect(hasUnsavedChanges()).toBe(true);

    unregister();

    expect(hasUnsavedChanges()).toBe(false);
  });
});
