import { useTypedStore } from '../../../core/store/hooks';

import type { RootState } from '../../../core/store/configure';

/**
 * Shared store probe for the MFA dialogs (`EnrolDialog`, `ReAuthDialog`): captures the real Redux
 * store instance from the same `Provider` tree a dialog renders under, so a test can inspect
 * `state.adminApi.mutations` directly -- this is how we prove a secret, an otpauth URI, or a
 * recovery code doesn't outlive its dialog in the store, not just in local component state.
 *
 * Module-scoped (not a React context) because the assertion runs from the test body, after
 * `render()`/`unmount()`, not from inside a component. `resetMfaStoreProbe()` must run in
 * `beforeEach` so a stale reference from a previous test can't leak into the next one.
 */
let capturedStore: ReturnType<typeof useTypedStore> | undefined;

const MfaStoreProbe = () => {
  capturedStore = useTypedStore();
  return null;
};

const resetMfaStoreProbe = () => {
  capturedStore = undefined;
};

/** True if any cached mutation result still carries one of the given secret substrings. */
const hasLeakedMfaSecrets = (...secrets: string[]) => {
  const state = capturedStore!.getState() as RootState;
  return Object.values(state.adminApi.mutations).some((entry) => {
    if (!entry?.data) {
      return false;
    }
    const json = JSON.stringify(entry.data);
    return secrets.some((secret) => json.includes(secret));
  });
};

export { MfaStoreProbe, resetMfaStoreProbe, hasLeakedMfaSecrets };
