import { useEffect } from 'react';
import { useStore } from 'react-redux';

/**
 * Inject a new reducer into the global redux-store.
 *
 * @export
 * @param {string} namespace - Store namespace of the injected reducer
 * @param {Function} reducer - Reducer function
 * @return void
 */

export function useInjectReducer(namespace, reducer) {
  const store = useStore();

  useEffect(() => {
    store.injectReducer(namespace, reducer);
  }, [store, namespace, reducer]);
}
