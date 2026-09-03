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

/**
 * True if any cached mutation entry still carries one of the given secret substrings, anywhere in
 * the entry -- not just its response `data`. RTK Query's mutation cache entry also keeps
 * `originalArgs` (the request body a component passed in, e.g. `enrol({ password })` or
 * `regenerateRecoveryCodes({ password, code })`), which a `data`-only check would miss entirely:
 * a password or a submitted TOTP/recovery code could sit in `originalArgs` long after the
 * response it was sent for, undetected. `JSON.stringify` of the whole entry pins both halves.
 */
const hasLeakedMfaSecrets = (...secrets: string[]) => {
  const state = capturedStore!.getState() as RootState;
  return Object.values(state.adminApi.mutations).some((entry) => {
    if (!entry) {
      return false;
    }
    const json = JSON.stringify(entry);
    return secrets.some((secret) => json.includes(secret));
  });
};

export { MfaStoreProbe, resetMfaStoreProbe, hasLeakedMfaSecrets };
