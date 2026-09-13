import { useEffect } from 'react';

import { registerUnsavedChangesCheck } from '../utils/unsavedChangesRegistry';

/**
 * Registers whether the current surface has unsaved edits so session-expiry
 * logout can warn before clearing auth state (which unmounts forms).
 */
const useRegisterUnsavedChanges = (id: string, enabled: boolean): void => {
  useEffect(() => {
    return registerUnsavedChangesCheck(id, () => enabled);
  }, [id, enabled]);
};

export { useRegisterUnsavedChanges };
