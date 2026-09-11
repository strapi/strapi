import { useTypedStore } from '../../../core/store/hooks';

import type { RootState } from '../../../core/store/configure';

/** Module-scoped rather than a context, because the assertion runs from the test body after
 * `unmount()`. `resetMfaStoreProbe()` must run in `beforeEach`. */
let capturedStore: ReturnType<typeof useTypedStore> | undefined;

const MfaStoreProbe = () => {
  capturedStore = useTypedStore();
  return null;
};

const resetMfaStoreProbe = () => {
  capturedStore = undefined;
};

/** The whole entry, not just `data`: RTK Query also keeps `originalArgs`. */
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
